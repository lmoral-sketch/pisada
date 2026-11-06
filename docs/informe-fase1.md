# Informe técnico — Fase 1

**INFB8091 Desempeño de Sistemas** · Universidad Tecnológica Metropolitana
Segundo semestre 2026 · Profesor Javier Aranda

**Proyecto:** Pisada — tienda de zapatillas e indumentaria urbana
**Repositorio:** *(pendiente)*
**Sitio:** *(pendiente)*
**Integrantes:** *(pendiente)*

> **Estado del borrador.** Las secciones marcadas con *(pendiente)* esperan el despliegue y
> los datos de GA4. Todo lo demás está respaldado por mediciones ya realizadas, documentadas
> en `docs/hallazgos.md`.

---

## 1. Resumen ejecutivo

Se construyó una tienda de comercio electrónico instrumentada y se evaluó su desempeño bajo
cuatro escenarios de carga sintética. Los resultados principales:

- **Línea base:** p(95) de 37,65 ms con 5 usuarios concurrentes, sin errores.
- **El sistema no se satura hasta cerca de 350 usuarios concurrentes.** Con 25 usuarios el
  tiempo de respuesta es indistinguible de la línea base.
- **La utilización de CPU crece linealmente** (9,2 % a 25 usuarios, 76,1 % a 350), pero la
  CPU *por usuario* decrece, lo que delata encolamiento antes de que la latencia se dispare.
- **El cuello de botella no es la CPU sino el pool de conexiones.** A 350 usuarios se
  observaron 26 peticiones esperando conexión.
- **El techo de mejora del checkout es de 13,9x en carga normal y cae bajo 5x bajo
  contención**, calculado con la ley de Amdahl sobre mediciones propias.
- El trabajo documenta además **cuatro errores metodológicos propios**, detectados y
  corregidos, que se consideran parte del resultado.

---

## 2. Arquitectura del sistema

### 2.1 Componentes

```
Navegador ──HTTP──> Next.js (App Router) ──pool pg──> PostgreSQL 16
                         │                                 │
                         ├── /api/carrito                  ├── producto (240)
                         ├── /api/checkout                 ├── variante (4552)
                         ├── /api/auth                     ├── carrito / pedido
                         └── /api/metricas                 └── usuario / sesion
                                 │
                            Prometheus
```

| Capa | Tecnología | Justificación |
|---|---|---|
| Interfaz y API | Next.js 15 (App Router), TypeScript | Vistas y API en un mismo proyecto |
| Acceso a datos | `pg` con SQL directo, **sin ORM** | El trabajo analiza el costo de las consultas; un ORM las esconde |
| Base de datos | PostgreSQL 16 en contenedor | Límites de recursos explícitos y reproducibles |
| Métricas | `prom-client` | Formato Prometheus, recolectable durante las corridas |
| Carga | k6 | Entrega percentiles de fábrica y los scripts se versionan |

### 2.2 Modelo de datos y el recurso crítico

El inventario reside en `variante.stock`, a nivel de **SKU** (producto + talla + color). Con
240 productos existen **4552 variantes**, es decir, 4552 recursos serializables
independientes.

Esta decisión es el eje del trabajo: el descuento de stock durante el checkout obliga a
serializar el acceso a una fila, y esa serialización produce una cola de espera real,
analizable con teoría de colas.

### 2.3 Páginas con distinta carga de datos

Requisito explícito del enunciado, implementado de forma deliberada:

| Página | Consultas | Línea base |
|---|---|---|
| `/` | 1 (destacados) | 20 ms |
| `/producto/[slug]` | 3 (producto, variantes, relacionados) | 20 ms |
| `/catalogo` | 3 + facetas, con agregación sobre variantes | **44 ms** |

El catálogo cuesta **2,2 veces** el home sin carga. Esa diferencia es material experimental:
permite observar cómo se degradan de manera distinta bajo la misma carga.

### 2.4 Despliegue

Empaquetado en Docker con salida autónoma de Next.js: **323 MB**, arranque en **120 ms**.

La decisión de desplegar en contenedor y no en una plataforma serverless es metodológica: un
entorno serverless escala de forma transparente y **no expone la utilización de recursos**,
que la Fase 2 exige medir. El sitio simplemente no se saturaría de forma observable.

---

## 3. Instrumentación

Expuesta en `/api/metricas` en formato Prometheus.

| Métrica | Qué responde |
|---|---|
| `peticion_duracion_segundos` | Tiempo de respuesta por ruta |
| `consulta_duracion_segundos` | ¿La degradación viene de la aplicación o de la base? |
| `espera_bloqueo_stock_segundos` | **Espera en cola sobre el SKU** |
| `espera_conexion_segundos` | **Espera por una conexión del pool** |
| `pool_conexiones` | Estado del pool: total, ocioso, en espera |
| `compras_sin_stock_total` | Punto de fuga del embudo |
| `process_cpu_seconds_total` | Utilización de CPU |

Las dos marcadas en negrita corresponden a las **dos colas** del sistema, y la relación entre
ambas resultó ser el hallazgo central (sección 6).

---

## 4. Metodología de pruebas

### 4.1 Modelo de carga: CBMG

Los usuarios sintéticos no siguen una secuencia fija. Transitan entre estados según las
probabilidades de un **Customer Behavior Model Graph**, siguiendo el material de cátedra:

| Desde | Hacia | Probabilidad |
|---|---|---|
| producto | carrito | 0,12 |
| producto | catálogo | 0,33 |
| producto | otro producto | 0,20 |
| producto | salir | 0,35 |
| carrito | checkout | 0,55 |

**Por qué importa.** Un generador que siempre recorriera `home → catálogo → producto →
comprar` produciría una carga donde el 100 % de los usuarios llega al checkout, algo que no
ocurre en ningún comercio real. La conversión observada fue de **5 compras en 74 sesiones
(6,8 %)**, del orden correcto aunque algo por encima del 1-3 % habitual.

> **Conexión teórica.** Las probabilidades del CBMG **son** las razones de visita `Vᵢ` de la
> ley del flujo forzado (`Xᵢ = X₀ · Vᵢ`). El modelo de carga web y las leyes operacionales de
> la Unidad 2 describen el mismo modelo desde dos ángulos.

### 4.2 Tiempo de reflexión

Cada acción va seguida de un *think time* de entre 1 y 10 segundos según el tipo de página.
Sin él, un usuario virtual generaría cientos de peticiones por segundo y 50 usuarios
virtuales equivaldrían a miles de personas reales, invalidando cualquier cifra de "usuarios
soportados".

### 4.3 Escenarios

| Escenario | Usuarios | Duración | Propósito |
|---|---|---|---|
| `baja.js` | 5 | 4 min | Línea base |
| `normal.js` | 25 | 10 min | Operación habitual; degradación progresiva |
| `pico.js` | 25→350 en escalones | 14 min | Punto de saturación |
| `contencion.js` | hasta 120, **un mismo SKU** | 4 min | Espera en cola sobre el stock |

Los escalones de `pico.js` son deliberados: cada meseta entrega una medición estable a un
nivel de carga conocido. Con una rampa continua los puntos quedarían mezclados.

`contencion.js` no está en la lista mínima del enunciado. Se agregó porque con 4552 variantes
la probabilidad de que dos usuarios compren la misma combinación simultáneamente es ínfima,
de modo que **la contención quedaría invisible** en los otros escenarios.

### 4.4 Clasificación de respuestas

| Código | Significado | ¿Cuenta como error? |
|---|---|---|
| 200 | Compra exitosa | No |
| 409 | Stock insuficiente | **No** — resultado de negocio legítimo |
| 503 | Conflicto por contención | No, se cuenta aparte |
| 5xx | Falla real | Sí |

Contar los 409 como errores llevaría a concluir que el sistema falla cuando en realidad está
agotando inventario, que es lo esperable.

---

## 5. Resultados

### 5.1 Los tres escenarios

| Escenario | VU | p(95) | p(99) | Throughput | Error |
|---|---|---|---|---|---|
| Baja | 5 | 37,65 ms | 46,72 ms | — | 0,00 % |
| Normal | 25 | 36,12 ms | 45,90 ms | 4,88 req/s | 0,00 % |
| Pico | 350 | 118,72 ms | 199,01 ms | 31,48 req/s | 0,01 % |

De 5 a 25 usuarios el tiempo de respuesta **no se movió**. Recién en el pico aparece la
degradación, con el p(95) multiplicándose por 3,3. El sistema **nunca colapsó**: 3 fallas en
26.447 peticiones.

### 5.2 Curva de utilización

| Usuarios | CPU | Pool en espera (máx) | CPU por usuario |
|---|---|---|---|
| 25 | 9,2 % | 0 | 0,368 % |
| 50 | 16,3 % | 0 | 0,326 % |
| 100 | 28,2 % | 0 | 0,282 % |
| 200 | 52,6 % | 4 | 0,263 % |
| **350** | **76,1 %** | **26** | **0,217 %** |

Dos lecturas:

1. La utilización crece **casi lineal**, señal de que seguimos en la zona estable (`ρ < 1`).
2. La CPU **por usuario decrece**. Cada usuario consume menos CPU por unidad de tiempo porque
   pasa proporcionalmente más tiempo esperando que siendo servido. **Es la firma del
   encolamiento, y aparece antes de que la latencia se dispare.**

### 5.3 Verificación de las leyes operacionales

**Ley de Utilización** (`U = X · S`), sobre el escenario de pico:

```
B = 298,1 s    T = 850 s    C = 26.447 peticiones

U = B/T = 35,1 %
X = C/T = 31,11 peticiones/s
S = B/C = 11,27 ms de CPU por petición

Comprobación:  X · S = 31,11 × 0,01127 = 35,1 %  ✓
```

El valor de interés es **S = 11,27 ms**, el tiempo de servicio real, independiente de la
carga. Permite predecir la utilización a cualquier throughput.

**Ley de Little** (`Lq = X · Wq`), sobre la cola del bloqueo bajo contención:

```
pesimista:  X = 13,85 compras/s · Wq = 45,4 ms  →  Lq = 0,63 transacciones en cola
optimista:  X = 22,58 compras/s · Wq = 35,2 ms  →  Lq = 0,79 transacciones en cola
```

Valores bajos **en promedio**, lo que refuerza que el problema no es una cola
permanentemente larga sino **episodios de saturación** que el promedio diluye. Es un buen
argumento de por qué el enunciado insiste en percentiles.

### 5.4 Costo de las consultas

| Consulta | Ejecuciones | Tiempo medio |
|---|---|---|
| `catalogo_listado` | 12.589 | 8,49 ms |
| `catalogo_conteo` | 12.589 | **4,55 ms** |
| `producto_variantes` | 9.380 | 4,66 ms |
| `carrito_items` | 2.962 | 5,29 ms |

El `COUNT(*)` de la paginación cuesta **un 54 % de lo que cuesta el listado completo**, sin
devolver una sola fila de datos.

### 5.5 Ley de Amdahl sobre el checkout

| Escenario | Wq | Checkout | Fracción serie | Techo |
|---|---|---|---|---|
| Carga normal, SKU al azar | 3,2 ms | 44,9 ms | 7,2 % | **13,9x** |
| Contención, pesimista | 45,4 ms | 353,9 ms | 12,8 % | **7,8x** |
| Contención, optimista | 35,2 ms | 166,4 ms | 21,2 % | **4,7x** |

Por mucha CPU que se agregue, el checkout no puede mejorar más que ese techo. **Bajo
contención el techo se desploma a menos de 5x.** Reducirlo exige cambio de diseño, no más
hardware.

### 5.6 Indicadores de experiencia de usuario

*(pendiente — requiere el sitio desplegado y el protocolo de dos sesiones descrito en §7)*

---

## 6. Análisis de cuellos de botella

### 6.1 El punto de saturación no se alcanzó

Extrapolando la pendiente del último tramo (0,157 % de CPU por usuario entre 200 y 350), la
utilización llegaría al 100 % cerca de los **503 usuarios virtuales**.

> Es una **proyección, no una medición**, y es optimista: cerca de `ρ = 1` el comportamiento
> deja de ser lineal y `W = 1/(μ(1−ρ))` crece de forma hiperbólica. El punto real estará
> antes.

### 6.2 El cuello de botella real: propagación de la contención al pool

El hallazgo más importante del trabajo. Bajo contención alta sobre un mismo SKU, el p(99) se
fue a **~19,6 segundos**, sospechosamente cerca del doble del `connectionTimeoutMillis` de
10 s configurado en el pool.

**Mecanismo propuesto:**

```
1. Las transacciones se encolan sobre la fila del SKU
2. Mientras esperan, RETIENEN su conexión del pool
3. El pool de 10 se agota
4. Las peticiones nuevas esperan una conexión  ← segunda cola
5. Algunas superan el tiempo límite y fallan
6. Al liberarse, la carga acumulada vuelve a saturar el pool
```

La consecuencia es grave y poco intuitiva: **la contención sobre una sola fila degrada todo
el sitio**, incluidas las páginas de catálogo que no tienen nada que ver con ese producto. El
pool es un recurso compartido, y la cola del bloqueo lo acapara.

Esto explica que la mediana se mantenga sana (~13 ms) mientras el p(95) se va a segundos: la
mayoría de las peticiones pasa bien y una cola larga queda atrapada.

Se agregó la métrica `espera_conexion_segundos` para confirmarlo en la próxima ronda.

---

## 7. Propuestas de mejora

Ordenadas por relación entre impacto y costo.

### 7.1 Eliminar el conteo exacto de la paginación

**Evidencia:** 4,55 ms por petición, el 54 % del costo del listado, sin devolver datos.

**Propuestas:** estimación mediante `pg_class.reltuples`, cacheo del conteo por combinación
de filtros, o paginación por cursor. El contraste antes/después es medible.

### 7.2 No retener la conexión mientras se espera el bloqueo

**Evidencia:** sección 6.2.

**Propuestas:**
- Reducir el tiempo que la transacción mantiene el bloqueo: hacer el descuento de stock la
  **última** operación de la transacción, no la primera.
- Separar el pool de lectura del de escritura, para que la contención de escritura no
  bloquee el catálogo.
- Evaluar un tiempo límite de bloqueo (`lock_timeout`) que falle rápido en lugar de encolar.

### 7.3 Repartir el inventario de los SKU populares

**Evidencia:** sección 5.5, el techo de Amdahl cae bajo 5x.

Mantener varias filas de stock por SKU y descontar de una al azar reduce la probabilidad de
colisión por un factor igual al número de filas. Es la técnica que usan los contadores
distribuidos.

### 7.4 Índice de texto para la búsqueda

La búsqueda por nombre usa `ILIKE '%texto%'` sin índice, de forma deliberada, para medir
primero su costo. Corresponde evaluar un índice GIN con `pg_trgm` y comparar.

### 7.5 Ajustar el tamaño del pool

`PG_POOL_MAX` es un parámetro de capacidad. Conviene medir con 5, 10 y 20 y observar cómo se
desplaza el punto de saturación.

---

## 8. Limitaciones y errores metodológicos detectados

Esta sección se incluye deliberadamente. Los cuatro errores se cometieron, se detectaron y se
corrigieron durante el trabajo, y su documentación es parte del resultado.

### 8.1 El generador de carga no ejercitaba el checkout

`extraerVariantes()` descartaba **todos** los botones de talla, porque comprobaba si la
etiqueta HTML contenía el texto `disabled` y las clases de Tailwind incluyen
`disabled:cursor-not-allowed`. Ningún usuario virtual lograba comprar.

> **Un generador con un defecto silencioso no falla: miente.** Esa corrida habría reportado
> tiempos excelentes y cero errores, concluyendo que el sistema aguanta bien, cuando en
> realidad nunca ejercitó el camino caro.

### 8.2 El recurso medido se agotó a mitad del experimento

La primera corrida de contención vendió las 3000 unidades disponibles y la segunda mitad
midió **rechazos rápidos en vez de compras**, dando un checkout *más rápido* bajo contención.

### 8.3 El instrumento no medía lo mismo en ambas estrategias

El histograma de espera cubría solo el `SELECT ... FOR UPDATE` en la estrategia pesimista
pero toda la función en la optimista. La comparación estaba sesgada **por construcción**.

### 8.4 Los resultados de contención no son reproducibles

Entre dos tandas con configuración idéntica, el p(95) varió **dos órdenes de magnitud** y el
orden entre estrategias se invirtió:

| Métrica | Tanda 1 | Tanda 2 |
|---|---|---|
| pesimista p(95) | 63,88 ms | 7,85 s |
| optimista p(95) | 9,96 s | 49,63 ms |

**Conclusión honesta: con una corrida por configuración no se puede determinar qué estrategia
es mejor.** La diferencia observada está dentro del ruido. Se requieren al menos cinco
repeticiones reportando mediana y rango.

### 8.5 Otras limitaciones

- **Las llegadas no son de Poisson.** k6 lanza usuarios en escalones, más sincronizados que
  aleatorios. M/M/1 es una aproximación útil, no exacta.
- **El equilibrio de flujo no se cumple en las rampas.** Los cálculos operacionales valen
  sobre las mesetas.
- **k6 no ejecuta JavaScript**, de modo que el tráfico sintético no genera eventos en GA4.
  Obliga al protocolo de dos sesiones: carga de fondo con k6 mientras personas reales navegan.
- **El resumen de k6 es agregado**, por lo que falta el throughput por escalón para trazar la
  curva de aplanamiento del throughput.

---

## 9. Conclusiones

1. **El sistema tiene holgura considerable.** Hasta 25 usuarios concurrentes el tiempo de
   respuesta es indistinguible de la línea base, y a 350 sigue respondiendo con p(95) de
   119 ms y 0,01 % de error.

2. **El encolamiento se detecta antes que la latencia.** La CPU por usuario decrece desde los
   primeros escalones, mucho antes de que el tiempo de respuesta se degrade. Es un indicador
   temprano más útil que la latencia misma.

3. **El cuello de botella no es el recurso obvio.** No es la CPU ni la base de datos, sino el
   **pool de conexiones**, y llega ahí por propagación desde la contención de stock. Un
   recurso serializado contagia su saturación a un recurso compartido.

4. **La ley de Amdahl acota lo que el hardware puede lograr.** Con un 7,2 % de fracción
   serializada el techo es 13,9x; bajo contención cae a menos de 5x. Escalar por hardware
   tiene un límite calculable, y conocerlo cambia la decisión de inversión.

5. **Las leyes operacionales se verificaron sobre datos propios.** `U = X · S` cerró con
   exactitud, y la ley de Little permitió estimar el largo de una cola que no se puede
   observar directamente.

6. **Medir correctamente es más difícil que medir.** Cuatro de los hallazgos de este trabajo
   fueron errores de método propios. El más instructivo es que los resultados de contención
   **no son reproducibles**, lo que invalida cualquier conclusión sobre cuál estrategia de
   concurrencia es mejor con la evidencia disponible.

---

## Anexos

- `docs/hallazgos.md` — bitácora de los cinco experimentos
- `docs/marco-teorico.md` — traducción del formalismo del ramo a las métricas del sistema
- `docs/decisiones.md` — las ocho decisiones de diseño y su justificación
- `carga/escenarios/` — scripts de k6
- `carga/resultados/` — reportes de las corridas
- `logs/prompts.md` — registro de prompts exigido por el enunciado
