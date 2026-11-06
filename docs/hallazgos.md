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
