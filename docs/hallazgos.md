# Hallazgos experimentales

Registro de los experimentos ejecutados y lo que arrojaron. Alimenta la sección de
resultados y análisis del informe técnico.

---

## E-01 — Primera verificación end-to-end y prueba de contención

**Fecha:** 3 de noviembre de 2026
**Entorno:** local. PostgreSQL 16.15 en contenedor con límites de **1 CPU y 512 MB**;
aplicación Next.js en modo producción (`next start`); pool de 10 conexiones.
**Catálogo:** 240 productos, **4552 variantes**, 539 sin stock (11,8 %), 80.989 unidades.

### Línea base de tiempos de respuesta (sin carga)

| Página | Tiempo | Observación |
|---|---|---|
| `/` (home) | 20 ms | La más liviana, como se diseñó |
| `/producto/[slug]` | 20 ms | Peso intermedio |
| `/catalogo` | 44 ms | **El doble que el home** |
| `/catalogo` con filtros | 30 ms | El filtro reduce el conjunto a agregar |

El catálogo cuesta aproximadamente **2,2 veces** el home sin ninguna carga encima. La
diferencia de peso entre páginas quedó establecida tal como se buscaba (decisión D-02), y
sirve de referencia para medir cuánto se separan bajo carga.

> Dato contraintuitivo: el catálogo **filtrado** salió más barato que el sin filtrar. Es
> coherente: el filtro reduce la cantidad de filas a agrupar. Conviene confirmarlo bajo
> carga, donde el costo de evaluar el filtro podría dejar de compensar.

### Prueba de contención: 60 compradores simultáneos, 50 unidades

Se fijó el stock de una variante en 50 unidades y se lanzaron **60 peticiones de pago
concurrentes** sobre ella, con cada cliente en su propia sesión.

**Estrategia pesimista** (`SELECT ... FOR UPDATE`):

| Desenlace | Peticiones | Media | Máximo |
|---|---|---|---|
| `200` compra exitosa | **50** | 25 ms | 59 ms |
| `409` sin stock | **10** | 12 ms | 14 ms |

**Estrategia optimista** (UPDATE condicional con reintentos):

| Desenlace | Peticiones | Media | Máximo |
|---|---|---|---|
| `200` compra exitosa | **50** | 23 ms | 65 ms |
| `409` sin stock | **10** | 23 ms | 76 ms |

**Stock final en ambos casos: 0. Variantes con stock negativo en toda la base: 0.**

### Lo que esto demuestra

1. **No hay sobreventa.** Con 60 compradores peleando por 50 unidades, se vendieron
   exactamente 50 y se rechazaron exactamente 10. El control de concurrencia funciona:
   sin él, varias transacciones habrían leído "stock = 50" a la vez y el inventario
   habría quedado negativo.
2. **No hay interbloqueos.** El orden global de bloqueo (decisión D-08) cumplió su
   función: ninguna transacción fue abortada por deadlock.
3. **Los rechazos son limpios.** Los 10 fallos devolvieron `409`, distinguibles de un
   error del sistema, tal como se diseñó en D-06.

### Hallazgo inesperado: la estrategia optimista no reintentó ni una vez

`pisada_reintentos` quedó en **cero** durante toda la corrida optimista, pese a los 60
clientes simultáneos.

**Explicación.** En PostgreSQL, bajo el nivel de aislamiento `READ COMMITTED` (el que viene
por defecto), un `UPDATE` que intenta modificar una fila **bloqueada por otra transacción no
falla: espera**. Cuando la transacción bloqueante confirma, PostgreSQL **vuelve a evaluar**
la condición `WHERE stock >= cantidad` sobre la versión nueva de la fila y, si se sigue
cumpliendo, aplica la actualización.

Es decir, nuestra implementación "optimista" **también hace cola sobre la misma fila**. El
reintento solo se dispara cuando la reevaluación falla, y en ese caso el stock
efectivamente se agotó — que es justamente cuando devolvemos `409`. De ahí el cero.

**Consecuencia para el análisis.** Las dos estrategias serializan en el mismo punto, y eso
explica que sus tiempos sean casi idénticos (25 ms frente a 23 ms de media). La diferencia
teórica entre "esperar" y "reintentar" **no se manifiesta con una sola fila en disputa bajo
`READ COMMITTED`**.

Esto no invalida la comparación: la vuelve más interesante, porque es un resultado que
contradice la intuición inicial documentada en `checkout.ts`. Para que la estrategia
optimista se comporte realmente como tal habría que usar el aislamiento
`REPEATABLE READ`, donde PostgreSQL **aborta** la transacción con un error de serialización
en vez de esperar, obligando al reintento.

> **Pendiente de experimentación:** repetir la prueba con `REPEATABLE READ` en la rama
> optimista y comparar las tres configuraciones. Ese contraste, con la explicación del
> mecanismo de `READ COMMITTED` detrás, es material de primer nivel para el informe.

### Estado del sistema durante la prueba

- `pisada_pool_conexiones{estado="en_espera"} 0` — el pool de 10 conexiones **nunca se
  saturó** con este nivel de concurrencia. El cuello de botella todavía no es el pool.
- `pisada_compras_sin_stock_total 20` — consistente con los 10 + 10 rechazos.
- `pisada_espera_bloqueo_stock_segundos` acumuló 61 observaciones en pesimista y 60 en
  optimista, con sumas de 151 ms y 109 ms respectivamente. La espera por operación es de
  pocos milisegundos: **a este nivel de carga la contención existe pero aún no duele**.

### Qué falta

La prueba se hizo con `curl` en paralelo, que es suficiente para demostrar correctitud pero
no para caracterizar la degradación. Los escenarios de k6 (`carga/escenarios/`) todavía no
se han ejecutado ni una vez: son los que entregarán la curva de saturación y los
percentiles del informe.

---

## E-02 — Validación de los generadores de carga

**Fecha:** 3 de noviembre de 2026
**Herramienta:** k6 v2.3.0

### Defecto encontrado en el generador

La primera ejecución de los scripts reveló que **ningún usuario virtual lograba comprar**.
El diagnóstico, forzando el embudo paso a paso, mostró que la función `extraerVariantes()`
devolvía cero variantes en todos los productos, pese a que el HTML sí traía 18 botones de
talla.

**Causa.** La función descartaba los botones deshabilitados comprobando si la etiqueta HTML
contenía el texto `disabled`:

```js
if (etiqueta.includes('disabled')) continue;   // ← incorrecto
```

Pero el atributo `class` generado por Tailwind incluye variantes como
`disabled:cursor-not-allowed`, `disabled:text-neutral-300` y `disabled:line-through`. Esa
condición era verdadera para **todos** los botones, de modo que se descartaban también los
comprables.

**Corrección.** Comprobar el atributo real, que React renderiza como `disabled=""`:

```js
if (/\sdisabled=""/.test(etiqueta)) continue;  // ← correcto
```

Tras la corrección, el embudo completo funciona desde k6: se detectaron entre 14 y 26
variantes comprables por producto y se concretaron compras con respuesta `200`.

**Lección para el informe.** Un generador de carga con un defecto silencioso **no falla: miente**.
Esta corrida habría reportado tiempos de respuesta excelentes y cero errores, con la
conclusión implícita de que el sistema aguanta sin problemas — cuando en realidad jamás
ejercitó el checkout, que es el camino caro. Validar que el generador hace lo que se cree
que hace es parte del método, no un paso opcional.

### Línea base confirmada (carga baja, 5 usuarios virtuales, 4 min)

| Métrica | Valor |
|---|---|
| `http_req_duration` mediana | 20,66 ms |
| p(90) | 33,69 ms |
| p(95) | **37,65 ms** |
| p(99) | 46,72 ms |
| máximo | 60,81 ms |
| Tasa de error | 0,00 % |
| Iteraciones completas | 74 |
| Compras concretadas | 5 |
| `pisada_checkout_duracion` p(95) | 37,25 ms |

La conversión fue de 5 compras en 74 sesiones (**6,8 %**), algo por encima del 1 % a 3 %
típico del comercio real, pero del orden de magnitud correcto. Al calibrar el CBMG con datos
reales de GA4 (Etapa II de la modelación) convendrá bajar la probabilidad de la transición
`producto → carrito`.

---

## E-03 — Los tres escenarios de carga y la curva de saturación

**Fecha:** 3–4 de noviembre de 2026
**Entorno:** PostgreSQL 16 en contenedor con 1 CPU y 512 MB; aplicación Next.js en modo
producción; pool de 10 conexiones; catálogo de 240 productos y 4552 variantes.
**Instrumentación:** muestreo de `/api/metricas` cada segundo durante toda la ejecución.

### Resumen de los tres escenarios

| Escenario | VU | Duración | p(95) | p(99) | Throughput | Error |
|---|---|---|---|---|---|---|
| Carga baja | 5 | 4 min | 37,65 ms | 46,72 ms | — | 0,00 % |
| Carga normal | 25 | 10 min | 36,12 ms | 45,90 ms | 4,88 req/s | 0,00 % |
| Pico | hasta 350 | 14 min | **118,72 ms** | **199,01 ms** | **31,48 req/s** | 0,01 % |

De 5 a 25 usuarios el tiempo de respuesta **no se movió** (incluso bajó levemente): el
sistema tenía holgura de sobra. Recién en el escenario de pico aparece la degradación, con
el p(95) multiplicándose por 3,3.

La tasa de error en el pico fue de 3 peticiones fallidas sobre 26.447, y la conversión del
embudo se mantuvo en 99,61 %. **El sistema nunca colapsó.**

### Curva de utilización de CPU por escalón

Cruzando el muestreo del servidor con el calendario de escalones de `pico.js`:

| Escalón | U (CPU de la aplicación) | Pool en espera (media) | Pool en espera (máximo) |
|---|---|---|---|
| 25 VU | 9,2 % | 0,00 | 0 |
| 50 VU | 16,3 % | 0,00 | 0 |
| 100 VU | 28,2 % | 0,00 | 0 |
| 200 VU | 52,6 % | 0,11 | 4 |
| **350 VU** | **76,1 %** | **0,77** | **26** |

**La utilización crece de forma casi lineal con los usuarios**, lo que confirma que dentro de
este rango el sistema todavía opera en la zona estable (`ρ < 1`) que describe la teoría de
colas. La CPU por usuario virtual, en cambio, **decrece** (0,368 %/VU a 25 usuarios frente a
0,217 %/VU a 350): cada usuario consume menos CPU por unidad de tiempo porque pasa una
proporción creciente del tiempo esperando, no siendo servido. Es la firma del encolamiento.

### El punto de saturación no se alcanzó

Extrapolando la pendiente del último tramo (0,157 % de CPU por usuario virtual entre 200 y
350 VU), la utilización llegaría al 100 % alrededor de los **503 usuarios virtuales**.

> **Esto es una proyección, no una medición.** La extrapolación lineal es optimista: a
> medida que `ρ → 1` el comportamiento deja de ser lineal y la degradación se acelera
> (`W = 1/(μ(1−ρ))` crece de forma hiperbólica). El punto real de saturación estará
> **antes** de los 503 usuarios. Confirmarlo exige una corrida que llegue a 600 u 800 VU.

### Primera señal del pool como cuello de botella

En el escalón de 350 VU, `pisada_pool_conexiones{estado="en_espera"}` llegó a **26
peticiones esperando** una conexión libre, con el pool en su máximo de 10. Es la primera
aparición de una cola real sobre el pool.

Fue transitorio (media de 0,77), pero marca la dirección: **el pool de conexiones, y no la
CPU, será probablemente el primer recurso en saturarse**. Es un parámetro de capacidad que
podemos variar (`PG_POOL_MAX`), lo que lo convierte en un buen objeto de experimentación.

---

## Aplicación de las leyes operacionales

### Ley de Utilización — `U = X · S`

Sobre el escenario de pico completo (850 s):

```
B (CPU ocupada)  = 298,1 s
T (duración)     = 850 s
C (peticiones)   = 26.447

U = B/T = 35,1 %
X = C/T = 31,11 peticiones/s
S = B/C = 11,27 ms de CPU por petición

Comprobación:  U = X · S = 31,11 × 0,01127 = 35,1 %  ✓
```

La ley se verifica sobre datos propios. El valor interesante es **S = 11,27 ms de CPU por
petición**, que es el tiempo de servicio real del recurso, independiente de la carga. Con
él, la utilización a cualquier throughput es predecible: a 60 peticiones/s se esperaría
`U = 60 × 0,01127 = 67,6 %`.

> Nota metodológica: esta `U` promedia rampas y mesetas, por lo que es menor que el 76,1 %
> observado en el escalón de 350 VU. Para el informe conviene repetir el cálculo por meseta,
> donde se cumple mejor el **supuesto de equilibrio de flujo**.

### Costo de las consultas, medido

| Consulta | Ejecuciones | Tiempo medio |
|---|---|---|
| `catalogo_listado` | 12.589 | **8,49 ms** |
| `catalogo_conteo` | 12.589 | **4,55 ms** |
| `producto_variantes` | 9.380 | 4,66 ms |
| `carrito_items` | 2.962 | 5,29 ms |

**Hallazgo:** el `COUNT(*)` para la paginación cuesta **4,55 ms, un 54 % de lo que cuesta el
listado completo**, pese a no devolver ni una fila de datos. Entre ambos suman 13,04 ms de
los ~44 ms que tarda la página de catálogo: la base de datos explica cerca del 30 % del
tiempo de esa página.

Es un candidato concreto de optimización para la sección de propuestas de mejora: el conteo
exacto podría reemplazarse por una estimación, o cachearse, o eliminarse usando paginación
por cursor.

### Ley de Amdahl sobre el checkout

```
Wq medio (espera de bloqueo de stock) = 3,23 ms
Duración media del checkout            = 44,95 ms

Fracción serializada    = 3,23 / 44,95 = 7,2 %
Fracción paralelizable  = f = 0,928
Aceleración máxima      = 1/(1 − f) = 13,9x
```

Aplicando `A = 1/[(1−f) + f/k]`:

| Factor de mejora `k` | Aceleración `A` | Mejora |
|---|---|---|
| 2 | 1,87x | 87 % |
| 4 | 3,29x | 229 % |
| 8 | 5,32x | 432 % |
| ∞ | **13,9x** | **techo absoluto** |

**Interpretación.** Por mucha CPU que se le agregue al checkout, **no puede mejorar más de
13,9 veces**, porque el 7,2 % de su tiempo es espera serializada sobre el bloqueo de stock y
esa fracción no se paralela. Reducirla exige un cambio de diseño —repartir el inventario en
varias filas por SKU, o reservar fuera de la transacción—, no más hardware.

> Esta cifra es **específica de nuestro nivel de carga actual**, donde la contención es baja.
> El escenario `contencion.js`, que concentra a todos los usuarios sobre un mismo SKU, debería
> aumentar la fracción serializada de forma sustancial y **bajar** el techo de Amdahl. Medir
> ambos casos y mostrar cómo el techo se desploma al subir la contención es el experimento
> más contundente que puede ofrecer el informe.

---

## Qué falta medir

- [ ] Corrida de pico con salida en serie temporal (`--out json`) para obtener el throughput
      **por escalón** y poder trazar la curva `X` frente a usuarios virtuales, que es donde
      se ve el aplanamiento característico de la saturación.
- [ ] Escalones hasta 600–800 VU para **alcanzar** el punto de saturación en vez de
      extrapolarlo.
- [ ] Variar `PG_POOL_MAX` (5, 10, 20) y observar cómo se desplaza el cuello de botella.
- [ ] Correr `contencion.js` y recalcular el techo de Amdahl bajo contención alta.
- [ ] Estimar `ρ`, `λ` y `μ` del bloqueo de stock y contrastar el `Wq` de M/M/1 contra el
      observado.

---

## E-04 — Contención alta sobre un mismo SKU: dos lecciones metodológicas

**Fecha:** 4 de noviembre de 2026
**Escenario:** `contencion.js`, escalones hasta 120 VU, todos comprando la **misma variante**.

Este experimento produjo el resultado más valioso del trabajo hasta ahora, pero no el que se
esperaba: produjo **dos lecciones sobre cómo NO medir**.

### Primer intento: el inventario se agotó

La corrida inicial partió con 3000 unidades y se vendieron las 3000 en la primera mitad. Las
4234 peticiones restantes recibieron `409` inmediato, sin tocar el bloqueo.

El resultado fue engañoso: `pisada_checkout_duracion` promedió **17,02 ms**, *más rápido* que
los 44,95 ms del escenario de pico. La lectura ingenua sería "la contención mejora el
desempeño", cuando en realidad la mitad de la corrida medía **rechazos rápidos, no compras**.

> **Lección.** En una prueba de carga sobre un recurso consumible, hay que garantizar que el
> recurso no se agote, o la segunda mitad del experimento mide un sistema distinto del que se
> quería estudiar. Se subió el stock a 30.000 unidades para las corridas definitivas.

### Segundo problema: el instrumento no medía lo mismo en ambas estrategias

Al revisar el código se detectó que `pisada_espera_bloqueo_stock_segundos` cubría intervalos
distintos según la estrategia:

| Estrategia | Qué abarcaba el temporizador |
|---|---|
| Pesimista | **Solo** el `SELECT ... FOR UPDATE` |
| Optimista | **Toda** la función, incluidos los `UPDATE` |

La comparación estaba sesgada a favor de la pesimista por construcción. Se corrigió
envolviendo ambas en `try/finally` sobre el tramo completo de *adquirir y modificar*.

> **Lección.** Antes de comparar dos implementaciones, hay que verificar que el instrumento
> mide el mismo intervalo en ambas. Un sesgo de instrumentación produce diferencias que
> parecen reales y no lo son.

### El hallazgo central: los resultados no son reproducibles

Con el instrumento corregido se repitieron ambas corridas. Comparando las dos tandas, con
**configuración idéntica**:

| Métrica | Tanda 1 | Tanda 2 |
|---|---|---|
| pesimista p(95) | 63,88 ms | **7,85 s** |
| pesimista p(99) | 19,76 s | 19,63 s |
| pesimista fallas | 7,85 % | 7,00 % |
| pesimista throughput | 30,30/s | 30,30/s |
| optimista p(95) | **9,96 s** | 49,63 ms |
| optimista p(99) | 19,81 s | 9,84 s |
| optimista fallas | 7,82 % | 1,51 % |
| optimista throughput | 29,37/s | 45,99/s |

El p(95) de cada estrategia **varió en dos órdenes de magnitud entre corridas idénticas**, y
el orden entre ambas se invirtió: la tanda 1 sugería que la pesimista era muy superior, la
tanda 2 sugiere lo contrario.

**Conclusión: con una corrida por estrategia no se puede distinguir cuál es mejor.** La
diferencia observada está dentro del ruido del experimento.

### Por qué varía tanto

El p(99) de ~19,6 s aparece en las cuatro corridas y es sospechosamente cercano a **dos veces
el `connectionTimeoutMillis` de 10 s** configurado en el pool. La interpretación más
plausible es que a 120 VU sobre un único SKU el sistema entra en un régimen inestable:

1. Las transacciones se encolan sobre la fila del SKU.
2. Mientras esperan, **retienen su conexión del pool**.
3. El pool de 10 se agota; las peticiones nuevas esperan una conexión.
4. Algunas superan el tiempo límite y fallan.
5. Al liberarse, la carga acumulada vuelve a saturar el pool.

Es un ciclo de realimentación: la cola del bloqueo **propaga la saturación al pool**, que es
un recurso compartido por todo el sitio. Eso explica por qué el p(95) global se degrada a
segundos aunque la mediana siga en ~13 ms: la mayoría de las peticiones pasa bien y una cola
larga de peticiones queda atrapada.

Pequeñas diferencias en el instante exacto en que se cruza ese umbral producen resultados
muy distintos. **El sistema es caótico en este régimen**, y eso es un hallazgo legítimo:
coincide con lo que predice la teoría de colas cuando `ρ → 1`.

### Lo que sí puede afirmarse

| Afirmación | ¿Sostenida por los datos? |
|---|---|
| A 120 VU sobre un mismo SKU el sistema se degrada severamente | **Sí.** p(99) ≈ 20 s en las cuatro corridas |
| Aparecen fallas reales, no solo rechazos de negocio | **Sí.** Entre 1,5 % y 7,9 % |
| La mediana se mantiene sana (~13-15 ms) | **Sí.** En las cuatro corridas |
| El cuello de botella se propaga del bloqueo al pool | **Plausible**, consistente con el p(99) ≈ 2× el tiempo límite. Falta confirmarlo |
| Una estrategia es mejor que la otra | **No.** La varianza entre corridas supera la diferencia |

### Ley de Little sobre la cola del bloqueo

Con los datos de la tanda corregida:

```
pesimista:  X = 13,85 compras/s · Wq = 45,4 ms  →  Lq = X·Wq = 0,63 transacciones en cola
optimista:  X = 22,58 compras/s · Wq = 35,2 ms  →  Lq = X·Wq = 0,79 transacciones en cola
```

Son valores bajos *en promedio*, lo que refuerza la interpretación anterior: el problema no
es una cola permanentemente larga, sino **episodios de saturación** que el promedio diluye.
Es un buen ejemplo de por qué el enunciado insiste en percentiles y no en promedios.

### Ley de Amdahl bajo contención

Fracción serializada del checkout, con el instrumento corregido:

| Escenario | Wq | Checkout | Fracción serie | Techo de Amdahl |
|---|---|---|---|---|
| Carga normal, SKU al azar | 3,2 ms | 44,9 ms | 7,2 % | **13,9x** |
| Contención, pesimista | 45,4 ms | 353,9 ms | 12,8 % | **7,8x** |
| Contención, optimista | 35,2 ms | 166,4 ms | 21,2 % | **4,7x** |

**El techo de mejora se desploma al subir la contención: de 13,9x a menos de 5x.** Por mucha
CPU que se agregue, bajo contención el checkout no puede mejorar más que eso. Esta es la
demostración empírica, con datos propios, de lo que la Ley de Amdahl predice en abstracto.

> Advertencia: estas cifras provienen de **una corrida por configuración** y, dada la varianza
> documentada arriba, deben tomarse como **órdenes de magnitud**, no como valores precisos.

### Qué hacer para cerrar este experimento

- [ ] **Repetir cada configuración al menos 5 veces** y reportar mediana y rango, no una
      corrida. Es la corrección más importante.
- [ ] Bajar la carga a 30–60 VU, donde el sistema probablemente aún no entre en el régimen
      inestable, y comparar ahí las estrategias con menos ruido.
- [ ] Instrumentar explícitamente el tiempo de espera **por una conexión del pool**, para
      confirmar o descartar la hipótesis de propagación.
- [ ] Probar con `PG_POOL_MAX` mayor: si la hipótesis es correcta, un pool más grande debería
      retrasar el colapso.

---

## E-05 — GA4 conectado, y una limitación importante del generador de carga

**Fecha:** 6 de noviembre de 2026
**ID de medición:** `G-P8EWE6D7G3` (propiedad *Pisada*)

### Verificación de la instrumentación

- La etiqueta `gtag.js` se sirve en todas las páginas.
- La librería carga efectivamente: `window.google_tag_manager` registra el contenedor
  `G-P8EWE6D7G3`.
- El embudo completo se recorrió en un navegador real (ficha → talla → carrito → pago) y la
  compra quedó registrada en la base como **pedido 20205**.

### Defecto de interfaz encontrado y corregido

Tras una compra exitosa, el mensaje de confirmación **desaparecía sin que el usuario
alcanzara a leerlo**. Causa: `BotonPagar` llamaba a `router.refresh()` al confirmarse el
pago; como el checkout vacía el carrito, el refresco volvía a renderizar la página en su
estado vacío, lo que desmontaba el propio componente que mostraba la confirmación.

Se quitó ese refresco. Es un defecto que **solo se ve recorriendo el flujo en un navegador**:
las pruebas con `curl` y con k6 lo daban por correcto, porque el endpoint respondía `200`.

> Vale como argumento metodológico para el informe: verificar por API no sustituye verificar
> la experiencia real. Son dos planos distintos, igual que los dos planos de indicadores que
> pide la Fase 2.

### LIMITACIÓN IMPORTANTE: k6 no ejecuta JavaScript

**k6 es un cliente HTTP, no un navegador.** Descarga el HTML pero no ejecuta los scripts de
la página. En consecuencia:

> **El tráfico sintético de k6 NO genera eventos en GA4.** Ni un `view_item`, ni un
> `add_to_cart`, ni un `purchase`, por muchos usuarios virtuales que se lancen.

Esto tiene dos consecuencias, una buena y una que obliga a cambiar el plan.

**La buena:** la propiedad de GA4 **no se contamina** con el tráfico de las pruebas de carga.
Las métricas de engagement reflejarán solo visitas humanas reales, que es lo que corresponde.

**La que obliga a cambiar el plan:** la Fase 2 pide comparar los indicadores de experiencia
de usuario **en condiciones normales frente a bajo carga generada**. Si la carga de k6 es
invisible para GA4, esa comparación no sale sola.

### Cómo resolverlo

El diseño correcto del experimento es **separar los dos roles**:

| Rol | Quién | Qué mide |
|---|---|---|
| **Carga de fondo** | k6 | Satura el servidor (plano A: servidor e infraestructura) |
| **Usuario observado** | Personas del equipo navegando | Vive la degradación (plano B: experiencia) |

**Procedimiento propuesto:**

1. **Sesión de control.** Con el sitio en reposo, los integrantes navegan el embudo completo
   varias veces. GA4 registra Core Web Vitals, duración de sesión y conversión en condiciones
   normales.
2. **Sesión bajo carga.** Se lanza `pico.js` contra el sitio desplegado y, **mientras corre**,
   los mismos integrantes repiten exactamente el mismo recorrido.
3. **Comparación.** Se contrastan ambas sesiones en GA4, segmentando por franja horaria.

Esto no es un parche: es **más fiel** a lo que el enunciado quiere medir. La pregunta de la
Fase 2 es cómo se degrada la experiencia de un usuario real cuando el sistema está cargado, y
la única forma honesta de responderla es que un usuario real la viva mientras el sistema está
cargado.

> Alternativa descartada: enviar los eventos al **Measurement Protocol** de GA4 desde el
> servidor. Funciona técnicamente, pero los eventos sintéticos no traen Core Web Vitals
> reales, que se miden en el navegador, y además ensuciarían la propiedad con sesiones
> ficticias. Se deja anotada por completitud.

### Pendiente de esta parte

- [ ] Dar acceso a `j.aranda@utem.cl` en la propiedad (requisito del enunciado)
- [ ] Verificar los cinco eventos en DebugView con el sitio desplegado
- [ ] Ejecutar el protocolo de dos sesiones descrito arriba, una vez desplegado

---

## E-06 — El costo de la red, medido: la ley general del tiempo de respuesta en acción

**Fecha:** 6 de noviembre de 2026
**Bases comparadas:** PostgreSQL local en contenedor (Docker) y Neon en AWS us-east-2 (Ohio),
medidas desde Chile. Mediana de 7 repeticiones por consulta.

### Resultados

| Operación | Local | Neon (Ohio) | Factor |
|---|---|---|---|
| Conectar | 29,3 ms | 1135,7 ms | 38,8x |
| `SELECT 1` (solo red) | 0,7 ms | **134,8 ms** | 199x |
| Conteo de productos | 0,6 ms | 135,6 ms | 226x |
| Listado con agregación | 1,3 ms | 137,5 ms | 108x |
| Conteo del catálogo | 1,0 ms | 135,8 ms | 141x |

A primera vista, Neon parece **200 veces más lento**. Esa lectura sería un error de análisis.

### Descomposición: separar la red del trabajo real

`SELECT 1` no hace trabajo apreciable en el servidor: su tiempo es, esencialmente, **el viaje
de ida y vuelta**. Restándolo de las demás consultas queda el trabajo real:

| Consulta | Trabajo local | Trabajo en Neon |
|---|---|---|
| Conteo de productos | ~0 ms | 0,7 ms |
| Listado con agregación | 0,6 ms | **2,7 ms** |
| Conteo del catálogo | 0,3 ms | 1,0 ms |

**La base de Neon hace el mismo trabajo en pocos milisegundos.** De los 137,5 ms que tarda el
listado, **134,8 ms son red y 2,7 ms son cómputo**: la red explica el **98 %** del tiempo.

Neon resulta unas 4 veces más lento en cómputo puro, lo que es esperable en un plan gratuito
compartido, pero esa diferencia es **irrelevante** frente a la latencia.

### Lectura con la teoría del ramo

Esto es la **ley general del tiempo de respuesta** de la Cátedra 1.1 de Análisis Operacional:

```
R = Σ Vᵢ · Rᵢ
```

El tiempo de respuesta es la suma de los tiempos de cada estación, **ponderada por su razón
de visita**. La red no es "ruido de medición": es una **estación de servicio más**, con su
propio tiempo de servicio, y hay que declararla como tal.

El factor crítico es la **razón de visita `V`**. La página de catálogo ejecuta **tres**
consultas, de modo que visita la estación de red tres veces:

| Ubicación de la aplicación | V | R por página solo en red |
|---|---|---|
| En Chile, base en Ohio | 3 | **~405 ms** |
| En Ohio, base en Ohio | 3 | ~3 ms |

**Conclusión operativa:** desplegar la aplicación en la misma región que la base no es una
preferencia, es la diferencia entre un sitio usable y uno inservible. Es la justificación
cuantitativa de la decisión de poner Render en Ohio.

### Consecuencia práctica observada durante el trabajo

Sembrar el catálogo contra Neon con inserciones de a una tomó **cerca de 11 minutos**, frente
a 8 segundos en local. Causa: 4552 inserciones × ~135 ms de viaje = 10,2 minutos de pura red.

Se agrupó la inserción de variantes por producto, bajando de **4552 viajes a 240**. Es la
misma ley aplicada a la inversa: reducir la razón de visita a la estación cara.

### Implicancias para las mediciones de la Fase 2

1. **Los tiempos locales y los de la nube no son comparables sin descontar la red.** El
   informe debe reportar ambos por separado.
2. **La latencia Chile → Estados Unidos se paga una vez por página**, no por consulta, siempre
   que aplicación y base estén juntas. Es aceptable y se declara.
3. **Antes de cada corrida de k6 hay que despertar ambos servicios.** El tiempo de conexión de
   1135 ms que se observó corresponde a la base suspendida: Neon escala a cero tras 5 minutos
   de inactividad. En régimen, conectar cuesta ~135 ms.

### Herramienta

La medición es reproducible con `web/db/medir-latencia.mjs`, que acepta dos cadenas de
conexión y reporta medianas, factor y trabajo descontada la red.

---

## E-07 — El sitio desplegado: descomposición del tiempo de respuesta real

**Fecha:** 11 de noviembre de 2026
**Sitio:** https://pisada.onrender.com (Render free, Ohio)
**Base:** Neon (Ohio), misma región que la aplicación
**Medido desde:** Chile

### Verificación funcional

Todas las rutas responden y el embudo completo funciona en producción:

| Operación | Resultado |
|---|---|
| Catálogo desde Neon | ✅ productos cargando |
| Etiqueta de GA4 | ✅ presente |
| Agregar al carrito | ✅ 200 |
| Checkout | ✅ 200, pedido 1 creado |
| Registro de usuario | ✅ 200 |

### Incidente de despliegue: Render ignora `render.yaml`

El primer despliegue falló con `failed to read dockerfile: open Dockerfile: no such file or directory`.

**Causa:** Render solo lee `render.yaml` cuando el servicio se crea como **Blueprint**. Al
crearlo desde *New → Web Service*, ese archivo se ignora por completo y se aplican los valores
por defecto, que buscan el `Dockerfile` en la raíz del repositorio.

**Solución:** en *Settings → Build & Deploy*, fijar **Root Directory** en `web`. Con eso
Render opera dentro de esa carpeta, encuentra el `Dockerfile` y usa el contexto correcto.

> Queda anotado porque afecta la reproducibilidad: quien replique el despliegue desde el
> `render.yaml` debe crear un **Blueprint**, no un Web Service.

### Descomposición del tiempo de respuesta

Tres mediciones independientes sobre las mismas páginas:

| Página | Local (sin red) | Servidor en producción | TTFB desde Chile |
|---|---|---|---|
| `/` | 20 ms | 86,3 ms * | 240 ms |
| `/catalogo` | 44 ms | **40,6 ms** | 348 ms |
| `/producto/[slug]` | 20 ms | 9,1 ms | 336 ms |

\* El valor del home incluye la primera consulta tras el arranque en frío y está sesgado al alza.

Aplicando la **ley general del tiempo de respuesta** (`R = Σ Vᵢ · Rᵢ`) sobre el catálogo:

```
R total (TTFB)        = 348 ms
R servidor (medido)   =  41 ms   ← aplicación + base, ambas en Ohio
R red (por diferencia)= 307 ms   ← Chile ↔ Ohio
```

**La red explica el 88 % del tiempo que percibe un usuario chileno.** El sistema que
construimos aporta 41 ms; los otros 307 son distancia geográfica.

Es la misma conclusión del experimento E-06, ahora medida de extremo a extremo y no solo
entre aplicación y base.

### Las consultas son más lentas en la nube de lo esperado

| Consulta | Local | Producción | Factor |
|---|---|---|---|
| `catalogo_listado` | 8,49 ms | 38,74 ms | 4,6x |
| `facetas_categorias` | — | 37,72 ms | — |
| `facetas_marcas` | — | 37,90 ms | — |
| `facetas_colores` | — | 37,04 ms | — |

Aplicación y base están **en la misma región**, así que esto no es latencia geográfica. Dos
explicaciones plausibles, que convendría separar:

1. **Render free entrega 0,1 CPU.** El cliente de PostgreSQL y el análisis de resultados
   corren en un procesador diez veces más lento que el local.
2. **Neon free usa compute compartido** y puede estar aplicando límites.

La uniformidad de los valores (37-38 ms en consultas de costo muy distinto) sugiere un
**costo fijo por consulta** más que trabajo real, lo que apunta a la primera explicación o a
sobrecarga de conexión. Queda como pendiente de investigación.

> Nota metodológica: que el catálogo tarde 40,6 ms en total mientras cada faceta tarda ~37 ms
> confirma que las consultas se ejecutan **en paralelo** (`Promise.all`), como se diseñó. Si
> fueran secuenciales, el total sería la suma: unos 190 ms.

### Consecuencias para la Fase 2

1. **Los escalones de `pico.js` hasta 350 usuarios serán excesivos** con 0,1 CPU. Hace falta
   una corrida exploratoria con 10, 25 y 50 usuarios para calibrar la escala.
2. **El arranque en frío se confirmó:** el primer acceso tras inactividad tardó 1,45 s frente
   a 0,64 s ya despierto. Render advierte que puede llegar a 50 s. Hay que despertar el sitio
   con `curl` antes de cada corrida.
3. **Los tiempos de la nube y los locales no son comparables sin descontar la red**, y ahora
   tenemos la cifra para descontarla: ~307 ms desde Chile.

---

## E-08 — Primera carga contra el sitio desplegado, y los gráficos del informe

**Fecha:** 14 de noviembre de 2026
**Objetivo:** calibrar la escala de carga contra producción, donde Render free entrega
**0,1 CPU** frente al 1 CPU del contenedor local.

### Arranque en frío, confirmado con cifras

| Acceso | Tiempo |
|---|---|
| Primero, tras inactividad | **15,08 s** |
| Segundo | 0,72 s |
| Tercero | 0,64 s |

Render advierte en su panel que la suspensión puede demorar las peticiones "50 segundos o
más". Medimos 15 s. **Confirma que despertar el sitio antes de cada corrida no es opcional:**
una corrida que empiece en frío tendría sus primeros percentiles dominados por el arranque.

### Carga baja contra producción: el contraste con local

Con **solo 5 usuarios virtuales**, 90 segundos:

| Métrica | Local (1 CPU) | **Producción (0,1 CPU)** | Factor |
|---|---|---|---|
| mediana | ~20 ms | **333,93 ms** | 17x |
| p(90) | 33,69 ms | **894,81 ms** | 27x |
| p(95) | 37,65 ms | **1,53 s** | **41x** |
| p(99) | 46,72 ms | **2,45 s** | 52x |
| Tasa de error | 0 % | 0 % | — |

**Con cinco usuarios, el p(95) en producción ya supera 1,5 segundos.** Localmente, ese mismo
escenario daba 37,65 ms y el sistema no mostraba degradación alguna hasta los 25 usuarios.

### Interpretación

Hay que descontar los ~307 ms de red medidos en el experimento E-07. Aun así:

```
p(95) producción        = 1530 ms
Red (Chile ↔ Ohio)      = ~307 ms
Servidor (por diferencia) = ~1223 ms
```

El servidor aporta **1,2 segundos** con apenas cinco usuarios. Comparado con los ~41 ms que
medimos sin carga en E-07, el servidor se degradó **30 veces** con una carga mínima.

**Causa:** los 0,1 CPU del plan gratuito. No es una décima parte de la capacidad local, sino
una décima parte **de un núcleo compartido**, con límites de ráfaga. El sistema entra en
encolamiento casi de inmediato.

### Consecuencia metodológica

**Los escalones de `pico.js` (25 → 350 usuarios) son inaplicables en producción.** A 5
usuarios ya estamos cerca del límite útil; a 25 el sitio probablemente deje de responder.

Para las mediciones contra producción hay que recalibrar a una escala de **2, 5, 10 y 15
usuarios**, que es donde está la zona interesante de ese entorno.

> Esto **no invalida** las mediciones locales: las valida como el entorno de estudio
> correcto. El contenedor con 1 CPU y 512 MB es un sistema **controlado y reproducible**;
> Render free es un entorno compartido cuyos límites no conocemos ni controlamos. El informe
> usa el local para el análisis cuantitativo y el desplegado para demostrar el funcionamiento
> real y medir la experiencia de usuario.

Es, además, un ejemplo directo del **análisis de sensibilidad** que describe la Cátedra 1.1:
el mismo sistema, bajo dos configuraciones de recursos, exhibe puntos de saturación que
difieren en un orden de magnitud.

### Gráficos del informe

Se generaron cinco gráficos en `docs/graficos/`, con el script `carga/graficar.py`:

| Archivo | Qué muestra |
|---|---|
| `utilizacion-cpu.svg` | Utilización frente a usuarios, con la proyección de saturación |
| `cpu-por-usuario.svg` | CPU por usuario decreciendo: la firma del encolamiento |
| `percentiles-escenarios.svg` | p(95) y p(99) de los tres escenarios |
| `techo-amdahl.svg` | El techo de mejora cayendo de 13,9x a 4,7x |
| `descomposicion-tiempo.svg` | 88 % red frente a 12 % servidor |

Se escribieron como **SVG a mano, sin librerías de graficación**. El archivo resultante es
texto: se versiona y se revisa en Git como cualquier otro fuente, y escala sin perder nitidez
al insertarlo en el informe.

### Pendiente

- [ ] Completar la calibración con 10, 20 y 40 usuarios contra producción
- [ ] Repetir el experimento de contención 5 veces por estrategia
      (`bash carga/repetir-contencion.sh 5 1500`, requiere la base local levantada)

---

## E-09 — Memoria y latencia del event loop bajo carga

**Fecha:** 15 de noviembre de 2026
**Contexto:** muestreo de 30 observaciones durante el experimento de contención, con el
contenedor limitado a **1 CPU y 512 MB**.

Se incorpora porque el enunciado pide utilización de **"CPU, memoria, I/O"** y hasta ahora el
análisis solo cubría CPU.

### Resultados

| Métrica | Mínimo | Máximo | Variación |
|---|---|---|---|
| Memoria residente del proceso | 294,3 MB | 295,6 MB | **1,3 MB** |
| Heap de V8 en uso | 60,9 MB | 114,5 MB | 53,6 MB |
| Memoria externa | 4,2 MB | 5,0 MB | 0,9 MB |
| **Latencia del event loop, p(99)** | **15,76 ms** | **22,32 ms** | 6,55 ms |

### Lectura

**La memoria no es un cuello de botella.** La residente se mantiene en ~295 MB sobre un
límite de 512 MB: una **utilización del 58 %**, estable. La variación de 1,3 MB bajo carga
descarta además una fuga de memoria, que era una de las degradaciones progresivas que el
escenario de carga sostenida buscaba detectar.

El heap de V8 oscila entre 61 y 114 MB. Esa oscilación **no indica un problema**: es el ciclo
normal del recolector de basura, que deja crecer el heap y lo compacta periódicamente. Lo
relevante es que la memoria residente no acompaña esa oscilación, señal de que el proceso
devuelve la memoria correctamente.

### El dato interesante: la latencia del event loop

Un p(99) de **15 a 22 ms** significa que, en el 1 % peor de los casos, una tarea esperó más
de 15 ms **solo para empezar a ejecutarse**, porque el event loop de Node estaba ocupado.

Es una **tercera cola**, además de las dos ya identificadas:

| Cola | Recurso en disputa |
|---|---|
| E4 — Bloqueo de stock | Una fila de `variante` |
| E2 — Pool de conexiones | 10 conexiones |
| **Event loop de Node** | **Un único hilo de ejecución** |

Node.js procesa las peticiones en un solo hilo. Cuando llegan más rápido de lo que se
despachan, se encolan en el event loop. Con 1 CPU asignada al contenedor, ese hilo **no puede
escalar**: es, por construcción, un recurso serializado más.

Esto refuerza el hallazgo central del trabajo desde otro ángulo. El sistema tiene **tres
puntos de serialización encadenados**, y la saturación de cualquiera se propaga a los demás.

### Sobre I/O de disco

**No se midió.** El enunciado menciona "CPU, memoria, I/O", y esta parte queda fuera.

La razón: el disco **no participa del camino crítico** de este sistema. Las consultas se
resuelven desde la caché de PostgreSQL —el catálogo completo ocupa pocos megabytes y cabe
holgadamente en los 512 MB del contenedor—, y la aplicación no lee ni escribe archivos
durante una petición. La escritura de pedidos sí toca disco, pero su volumen es despreciable
frente al tráfico de lectura.

Se declara como limitación en vez de presentar una medición que no aportaría información.

---

## E-10 — Carga contra producción y la confirmación definitiva de la varianza

**Fecha:** 15 de noviembre de 2026

### Parte A — Carga sostenida contra el sitio desplegado

12 usuarios virtuales durante 6 minutos contra https://pisada.onrender.com (0,1 CPU).

| Métrica | Valor |
|---|---|
| Mediana | 384,7 ms |
| p(90) | 1.268,4 ms |
| p(95) | **1.736,6 ms** |
| p(99) | 4.112,1 ms |
| Máximo | 4.713,3 ms |
| **Tasa de error** | **0,00 %** |
| Throughput | 2,36 req/s |
| Compras completadas | 24 |

**Lectura.** Con 12 usuarios el p(95) supera 1,7 segundos, pero **sin una sola falla**. El
sistema no se cae: se encola. Es exactamente el comportamiento que predice la teoría de colas
cuando `ρ` se acerca a 1 sin superarlo — el tiempo de espera crece, el throughput se mantiene.

Comparado con la línea base local (p95 de 37,65 ms con 5 usuarios), la diferencia es de **46
veces**, atribuible a los 0,1 CPU del plan gratuito más los ~307 ms de red.

k6 marcó el umbral `p(95)<1500` como cruzado, lo que es correcto: ese umbral se calibró para
el entorno local.

### Parte B — La varianza, confirmada de forma definitiva

Se repitió el experimento de contención con **configuración idéntica** en las cuatro
corridas: misma variante, mismo stock repuesto antes de cada una, misma estrategia
(pesimista), mismo script.

| Repetición | p(95) | p(99) | Media | Throughput | Error | Compras |
|---|---|---|---|---|---|---|
| 1 | 17.962 ms | 18.968 ms | 1.780 ms | 19,94/s | 18,98 % | 2.083 |
| 2 | 18.766 ms | 20.178 ms | 2.335 ms | 15,87/s | 21,28 % | 1.691 |
| 3 | 10.006 ms | 19.825 ms | 1.013 ms | 27,41/s | 8,73 % | 3.399 |
| **4** | **36 ms** | **233 ms** | **96 ms** | **49,43/s** | **1,00 %** | **6.802** |

**El p(95) va de 36 ms a 18.766 ms: un factor de 524 entre corridas idénticas.**

La repetición 4 no solo fue 500 veces más rápida: completó **3,3 veces más compras** (6.802
frente a 2.083) con **un veinteavo de la tasa de error** (1 % frente a 19 %).

### Por qué ocurre: dos regímenes, no un continuo

Las cuatro corridas no muestran una distribución con dispersión alta. Muestran **dos estados
cualitativamente distintos**:

| | Régimen estable (rep. 4) | Régimen saturado (rep. 1, 2, 3) |
|---|---|---|
| p(95) | decenas de ms | decenas de segundos |
| Error | ~1 % | 9-21 % |
| Throughput | 49/s | 16-27/s |

El sistema **cae a uno u otro según cómo se encadenen los primeros segundos** de la corrida.
Es coherente con el ciclo de realimentación descrito en E-04: si las primeras transacciones
alcanzan a liberar sus conexiones antes de que lleguen las siguientes, el pool nunca se agota
y el sistema se mantiene estable; si no, el pool se satura y la cola se realimenta.

Es un **sistema biestable**, no un sistema con ruido. Promediar las cuatro corridas produciría
un número que no describe ninguno de los dos comportamientos reales.

### Consecuencia para las conclusiones del trabajo

Esto **refuerza y no debilita** la conclusión ya documentada en E-04:

> Con la evidencia disponible **no se puede determinar qué estrategia de concurrencia es
> mejor**. La varianza entre corridas de la misma configuración supera con creces cualquier
> diferencia entre configuraciones distintas.

Cuatro repeticiones de la misma estrategia difieren en un factor de 524. Cualquier
comparación entre pesimista y optimista basada en una corrida de cada una estaría midiendo
**en qué régimen cayó cada corrida**, no la diferencia entre estrategias.

**Para resolverlo** haría falta: correr fuera del régimen inestable (menos usuarios
virtuales), o repetir decenas de veces y comparar la **proporción de corridas que caen en cada
régimen**, que es una pregunta distinta y más interesante que comparar medianas.

### Limitación de esta corrida

Se completaron 4 de las 10 repeticiones planificadas (5 por estrategia); la serie se
interrumpió al detenerse el servidor local. **No hay repeticiones de la estrategia optimista**,
de modo que la comparación entre estrategias sigue abierta.

Las 4 repeticiones obtenidas son suficientes para sostener la conclusión sobre la varianza,
que es el hallazgo relevante.

---

## E-11 — Integración con Transbank Webpay Plus y el costo de un tercero

**Fecha:** 15 de noviembre de 2026
**Ambiente:** integración de Transbank (`webpay3gint.transbank.cl`), credenciales públicas.

Cierra la brecha B-01 de la auditoría: el enunciado pedía *"checkout simulado con sandbox de
algún medio de pago disponible en Chile"*.

### Flujo verificado de extremo a extremo

| Paso | Resultado |
|---|---|
| 1. Crear transacción | Token real emitido por Transbank |
| 2. Redirección al formulario | Monto correcto, $44.990 |
| 3. Tarjeta de prueba VISA | Aceptada |
| 4. Autenticación en banco simulado | RUT `11.111.111-1` |
| 5. Retorno y confirmación (`commit`) | **Aprobada** |
| 6. Descuento de stock y creación del pedido | **Pedido N° 1 creado** |

Datos de la transacción confirmada:

```
Orden de compra:        PSD-1794761434584-1445
Código de autorización: 1213
Tarjeta:                ···· 6623
Monto:                  $44.990
```

### El dato que justifica la decisión de diseño

Se instrumentó el tiempo de cada llamada a Transbank:

| Operación | Tiempo |
|---|---|
| Crear la transacción | **160 ms** |
| Confirmar el pago (`commit`) | **377 ms** |
| **Total atribuible al tercero** | **537 ms** |

Compárese con el checkout propio, medido en el mismo entorno:

| Camino | Tiempo |
|---|---|
| Checkout propio (`/api/checkout`) | **~50 ms** |
| Checkout con Webpay | **~590 ms** |

**La integración con el tercero multiplica por 11 el tiempo del checkout**, y esos 537 ms
ocurren **fuera de nuestro sistema**: no los controlamos, no los podemos instrumentar por
dentro y varían según la carga de Transbank, no la nuestra.

### Por qué Webpay es un camino paralelo y no un reemplazo

Esta es la justificación, ahora **respaldada con datos**, de por qué el análisis de desempeño
se hace sobre el checkout propio:

1. **Dominaría la medición.** Con 537 ms de un tercero sobre ~50 ms propios, el 91 % del
   tiempo del checkout sería ruido externo. La contención sobre el stock —3,23 ms de espera
   en bloqueo— quedaría completamente enterrada.

2. **Invalidaría la ley de Amdahl.** La fracción serializada que calculamos (7,2 %) se
   mediría contra un total inflado por la red, dando un techo irreal.

3. **k6 no puede recorrerlo.** Webpay opera por redirección a un sitio externo con formulario
   y autenticación bancaria. Un cliente HTTP no completa ese flujo, de modo que el escenario
   de contención —el núcleo del trabajo— sería imposible de ejecutar.

4. **Introduciría una variable no controlada.** El tiempo de Transbank depende de su propia
   carga. Dos corridas idénticas nuestras darían resultados distintos por causas ajenas.

### Arquitectura resultante

```
/api/checkout          → checkout propio, instrumentado, sometido a carga  ← ANALIZADO
/api/checkout/webpay   → inicia transacción en Transbank                   ← DEMOSTRACIÓN
/webpay/retorno        → confirma el pago y crea el pedido
```

**Ambos caminos comparten la misma lógica de descuento de inventario.** El retorno de Webpay
llama a `procesarCheckout()`, la misma función con el mismo control de concurrencia. Lo que
cambia es el medio de pago, no el tratamiento del recurso crítico.

### Detalle de implementación: el `commit` no es opcional

Webpay exige que el comercio **confirme** la transacción tras el retorno. Si no lo hace,
Transbank **revierte el cargo automáticamente**.

Es, conceptualmente, un `COMMIT` de transacción distribuida: el pago no queda cerrado hasta
que ambas partes lo acuerdan. Por eso el pedido se crea **después** de confirmar, nunca antes:
crear el pedido sin confirmar dejaría inventario descontado contra un cargo que se revertiría.

### Caso límite manejado

Si Transbank aprueba el pago pero el stock se agotó mientras el usuario pagaba, la página de
retorno lo informa de forma explícita y señala que en un comercio real correspondería
**revertir la transacción**. Es una situación real del comercio electrónico que el diseño del
trabajo —descontar stock al pagar y no al agregar al carrito— hace posible.

### Las tarjetas de prueba están a la vista

La interfaz muestra las tarjetas del ambiente de integración junto al botón de pago. No es un
descuido: en un sandbox el usuario necesita saber qué tarjeta usar, y tenerlas visibles
**evita que alguien intente con una tarjeta real**.

### Nota: el costo de Transbank depende de dónde esté la aplicación

Verificado el mismo flujo en producción, se observó una diferencia sistemática:

| Origen de la llamada | Crear transacción |
|---|---|
| Local (Chile) | **160 ms** |
| Render (Ohio) | **336-354 ms** |

Transbank opera en Chile. Desde la aplicación local la llamada es prácticamente local; desde
Render cruza el continente de ida y vuelta.

Es la **ley general del tiempo de respuesta** otra vez, y con una consecuencia incómoda: la
decisión de desplegar en Ohio —correcta para minimizar la latencia entre aplicación y base de
datos— **duplica el costo de la llamada al medio de pago**.

No hay una configuración óptima para ambos: la base conviene cerca de la aplicación, y el
medio de pago conviene cerca del usuario. Un comercio real en Chile resolvería esto
desplegando en una región sudamericana, aceptando a cambio otras restricciones de proveedor.

---

## E-12 — El punto de saturación, alcanzado: el peso de las páginas lo determina

**Fecha:** 17 de noviembre de 2026
**Motivo:** un rediseño de la interfaz aumentó el peso de las páginas, y hubo que repetir
todas las mediciones. El resultado fue mejor que el objetivo.

### Lo que cambió en el sistema

El rediseño agregó ilustraciones SVG por categoría y más estructura al home. **Sin agregar
ninguna petición de red ni consulta a la base**: todo es marcado dentro del HTML que ya se
servía. Lo único que creció es el trabajo de renderizado y el tamaño de la respuesta.

| Página | Diseño anterior | Diseño actual |
|---|---|---|
| Home | 20 ms | **21 ms** |
| Detalle de producto | 20 ms | **36 ms** |
| Catálogo | 44 ms | **75 ms** |

La jerarquía que el trabajo necesita no solo se conserva: **se acentúa**. El catálogo pasó de
costar 2,2 veces el home a costar **3,6 veces**.

### El resultado: saturación alcanzada

| Usuarios | CPU (anterior) | **CPU (actual)** | Pool en espera, máximo |
|---|---|---|---|
| 25 | 9,2 % | 10,4 % | 4 |
| 50 | 16,3 % | 17,8 % | 4 |
| 100 | 28,2 % | 31,8 % | 4 |
| 200 | 52,6 % | 61,3 % | **40** |
| **350** | 76,1 % | **96,6 %** | **222** |

**Con el diseño anterior el punto de saturación no se alcanzaba** y hubo que proyectarlo en
~503 usuarios, declarándolo explícitamente como estimación. Con las páginas más pesadas, la
saturación llega **dentro del rango medible**: 96,6 % de utilización a 350 usuarios.

> **El punto de saturación ya no es una proyección. Es una medición.**

### Efecto sobre el tiempo de respuesta

| Escenario | p(95) anterior | **p(95) actual** | Error |
|---|---|---|---|
| Baja, 5 VU | 37,65 ms | 54,03 ms | 0,00 % |
| Normal, 25 VU | 36,12 ms | **35,30 ms** | 0,00 % |
| **Pico, 350 VU** | 118,72 ms | **1.560 ms** | 0,01 % |

Con 25 usuarios el sistema **no acusa el cambio**: 35,30 ms frente a 36,12 ms. Con 350, el
p(95) se multiplica por **13**.

Es la firma de un sistema que cruza su punto de saturación: hasta cierto nivel de carga el
trabajo extra se absorbe sin consecuencias, y pasado ese punto la degradación es abrupta.
Coincide con lo que predice la teoría de colas: `W = 1/(μ(1−ρ))` crece de forma hiperbólica
cuando `ρ → 1`.

**El throughput confirma la saturación:** 29,51 req/s frente a 31,48 del diseño anterior. Con
páginas más caras el sistema atiende **menos** peticiones por segundo, aunque haya más
usuarios pidiendo. El servidor dejó de poder seguir el ritmo.

### La hipótesis del pool, CONFIRMADA

El experimento E-04 planteó que la saturación se propaga al pool de conexiones, pero solo
pudo inferirlo de que el p(99) se parecía al doble del tiempo límite. Ahora se mide directo:

| Usuarios | Peticiones esperando conexión |
|---|---|
| 100 | 4 |
| 200 | **40** |
| 350 | **222** |

Con 350 usuarios hay **222 peticiones encoladas esperando una de las 10 conexiones del pool**.
La cola es 22 veces más larga que el pool completo.

**Esto confirma el hallazgo central del trabajo.** El pool no es un detalle de configuración:
es el recurso que primero se agota, y su cola crece de forma explosiva —de 4 a 40 a 222— en
cuanto la CPU se acerca a su límite.

### La conclusión que esto habilita

> **El peso de las páginas determina el punto de saturación.**

Es el mismo sistema, el mismo hardware, el mismo generador de carga y los mismos escenarios.
Lo único que cambió fue cuánto trabajo cuesta renderizar cada página. Y con eso, el punto en
que el sistema se satura se movió desde **más allá de 500 usuarios hasta 350**.

Dicho de otro modo: **aligerar las páginas es una estrategia de capacidad**, no solo una
mejora de experiencia. Una página un 70 % más pesada no cuesta un 70 % más de usuarios
soportados: cuesta mucho más, porque la degradación cerca de la saturación no es lineal.

Es, además, un **análisis de sensibilidad** en el sentido estricto de la Cátedra 1.1: se
varió un parámetro del sistema y se observó el desplazamiento del punto de operación.

### Un problema de método detectado

El escenario de carga baja arrojó un p(95) de **54,03 ms**, peor que los 35,30 ms de la carga
sostenida, que tiene **cinco veces más usuarios**. Eso no tiene sentido físico.

La causa es estadística: `baja.js` genera solo **235 peticiones**, de modo que el p(95) se
calcula sobre unas 12 muestras en la cola. Un par de peticiones lentas —el primer acceso al
pool, la primera compilación de una consulta en PostgreSQL— mueven el percentil completo.
`normal.js` genera **3.112** peticiones, y ahí el percentil es estable.

**Consecuencia:** para la línea base debe usarse la **mediana** (20,02 ms, consistente con los
21 ms medidos directamente), no el p(95). Se declara en lugar de reportar un percentil que la
cantidad de muestras no sostiene.

Es el mismo error de fondo que el experimento E-04: **conclusiones sacadas de pocas muestras**.
Esta vez se detectó antes de escribirlo en el informe.

---

## E-13 — Estrategias de concurrencia fuera del régimen inestable

**Fecha:** 17 de noviembre de 2026
**Carga:** 40 usuarios virtuales, cinco repeticiones por estrategia, inventario repuesto antes
de cada corrida.

El experimento E-04 dejó abierta la comparación entre las dos estrategias de control de
concurrencia, porque a 120 usuarios el p(95) variaba por un factor de 524 entre corridas
idénticas. Esta corrida baja la carga para salir de ese régimen.

### Bajar la carga sí redujo la varianza

| Métrica | Varianza a 120 VU | Varianza a 40 VU |
|---|---|---|
| p(95) pesimista | 524x | **7,3x** |
| p(95) optimista | — | **1,8x** |

El sistema salió del régimen caótico. Pero **no lo suficiente para separar las estrategias**.

### Resultados

| Métrica | Pesimista (mediana) | Optimista (mediana) | ¿Se solapan los rangos? |
|---|---|---|---|
| p(95) | 36,0 ms | 22,7 ms | **Sí** |
| Media | 65,7 ms | 141,0 ms | **Sí** |
| Throughput | 22,8 req/s | 21,3 req/s | **Sí** |

**En las tres métricas centrales los rangos se solapan.** La mediana del p(95) favorece a la
optimista y la de la media favorece a la pesimista, lo que por sí solo ya indica que no hay
una diferencia consistente.

> **Conclusión: con cinco repeticiones por estrategia no se puede afirmar que una sea mejor
> que la otra.** Es el mismo veredicto del E-04, ahora con menos ruido y por lo tanto más
> sólido.

### Un patrón en las colas, que no alcanza para afirmar

Donde sí se observa una diferencia es en los valores extremos:

| | Pesimista | Optimista |
|---|---|---|
| p(99) mediana | 260,6 ms | 401,4 ms |
| **p(99) máximo** | **18.550 ms** | 10.007 ms |
| Error máximo | **6,58 %** | 2,22 % |

La estrategia pesimista tuvo **dos excursiones graves** en cinco corridas: p(99) de 14,1 s y
18,6 s, con 2,4 % y 6,6 % de error. La optimista no superó los 10 s ni el 2,2 %.

Es coherente con el mecanismo: la pesimista **bloquea y espera**, de modo que varias
transacciones encadenadas acumulan espera; la optimista **reintenta**, así que ninguna queda
bloqueada indefinidamente.

**Pero dos excursiones en cinco corridas no son evidencia suficiente.** Podrían ser
coincidencia. Se deja anotado como observación, no como conclusión, y confirmarlo exigiría
del orden de veinte repeticiones por estrategia.

---

## E-14 — La propuesta del `COUNT(*)`, refutada por medición

**Fecha:** 17 de noviembre de 2026
**Carga:** 25 usuarios virtuales, 3 minutos, con cada implementación.

La sección 7.1 del informe proponía reemplazar el conteo exacto de la paginación por una
estimación desde `pg_class.reltuples`, con el argumento de que el `COUNT(*)` costaba 4,55 ms
—un 54 % del listado— sin devolver una sola fila de datos.

Se implementó la propuesta y se midió.

### Resultados

| | Conteo exacto | Conteo estimado |
|---|---|---|
| Costo de la consulta de conteo | **5,03 ms** | **4,96 ms** |
| p(95) de la página de catálogo | **31,31 ms** | **52,29 ms** |
| Throughput | 5,12 req/s | 5,13 req/s |

**La optimización no ahorra nada.** El conteo estimado cuesta prácticamente lo mismo que el
exacto: 4,96 ms frente a 5,03 ms, una diferencia del 1,4 % que está dentro del ruido.

### Por qué la propuesta estaba equivocada

El razonamiento original asumía que los 4,55 ms del `COUNT(*)` eran **trabajo de cómputo**:
recorrer filas para contarlas. Si así fuera, estimar en vez de contar ahorraría ese trabajo.

La medición muestra que no es así. Con 240 productos, contar es trivial; los ~5 ms son
**costo fijo por consulta**: el viaje de ida y vuelta al servidor, la planificación y el
manejo del resultado. Reemplazar una consulta barata por otra consulta barata **no ahorra
nada, porque sigue siendo una consulta**.

### Qué sí serviría

La mejora real no es *reemplazar* la consulta sino **eliminarla**:

- **Paginación por cursor** (`WHERE id > ultimo LIMIT n`), que no necesita total.
- **Cachear el total** por combinación de filtros, con invalidación por tiempo.
- **No mostrar el total** y usar un "cargar más", que es lo que hacen muchos catálogos
  grandes.

Las tres eliminan la consulta en vez de abaratarla, que es donde está el costo real.

### Lección metodológica

> Una propuesta de optimización derivada de un número **no es una conclusión hasta que se
> mide**. El número era correcto —el conteo sí cuesta 4,55 ms— pero la **interpretación** de
> ese número era falsa, y de ahí salió una propuesta que no funciona.

Este trabajo prefiere publicar una propuesta propia refutada por su propia medición antes que
dejarla enunciada y sin probar.
