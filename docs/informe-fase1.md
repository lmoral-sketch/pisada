# Informe técnico — Fase 1

**INFB8091 Desempeño de Sistemas** · Universidad Tecnológica Metropolitana
Segundo semestre 2026 · Profesor Javier Aranda

**Proyecto:** Pisada — tienda de zapatillas e indumentaria urbana
**Repositorio:** https://github.com/lmoral-sketch/pisada
**Sitio:** https://pisada.onrender.com
**Integrantes:**

| # | Nombre |
|---|---|
| 1 | Catalina Emilia Araniz Arancibia |
| 2 | Gabriel Ignacio Araya López |
| 3 | Bianca Paola Torres Rivadeneira |
| 4 | Lucas Ángel Mora Loiza |
| 5 | Matías Torres Estay |

---

## 1. Resumen ejecutivo

Se construyó una tienda de comercio electrónico instrumentada y se evaluó su desempeño bajo
cuatro escenarios de carga sintética. Los resultados principales:

- **Línea base:** mediana de 20,02 ms con 5 usuarios concurrentes, sin errores. (Se usa la
  mediana y no el p(95): con 235 peticiones el percentil no es estable, ver §5.1.)
- **El punto de saturación se alcanzó y se midió:** 96,6 % de CPU con 350 usuarios
  concurrentes. Con 25 usuarios el tiempo de respuesta es indistinguible de la línea base.
- **La utilización de CPU crece linealmente** (10,4 % a 25 usuarios, 96,6 % a 350), pero la
  CPU *por usuario* decrece, lo que delata encolamiento antes de que la latencia se dispare.
- **El pool de conexiones se encola antes que se agote la CPU.** A 350 usuarios se midieron
  **222 peticiones esperando** una de las 10 conexiones disponibles. Que agrandar el pool
  mejore el tiempo de respuesta se midió, se publicó y luego **se refutó al repetir el
  experimento** (§7.5): queda como hipótesis, no como hallazgo.
- **El techo de mejora del checkout es de 13,9x en carga normal y cae bajo 5x bajo
  contención**, calculado con la ley de Amdahl sobre mediciones propias.
- El trabajo documenta además **cinco errores metodológicos propios**, detectados y
  corregidos, que se consideran parte del resultado. El quinto —haber publicado como
  confirmado un hallazgo que no resistió la repetición— se detectó en la auditoría interna del
  propio trabajo.

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
| `/` | 1 (destacados) | 21 ms |
| `/producto/[slug]` | 3 (producto, variantes, relacionados) | 36 ms |
| `/catalogo` | 3 + facetas, con agregación sobre variantes | **75 ms** |

El catálogo cuesta **3,6 veces** el home sin carga. Esa diferencia es material experimental:
permite observar cómo se degradan de manera distinta bajo la misma carga, y resultó
determinar el punto de saturación del sistema completo (§6.1).

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

### 3.1 Configuración de Google Analytics 4

Propiedad **`G-P8EWE6D7G3`**, instrumentada con `gtag.js` desde el layout de la aplicación
(`web/src/app/layout.tsx`), con el identificador inyectado en tiempo de compilación. El rol de
**Analista** está otorgado a `j.aranda@utem.cl`. La configuración completa, paso a paso, está
en `docs/despliegue.md`.

| Captura | Qué documenta |
|---|---|
| ![Flujo de datos de GA4](assets/ga4/01-flujo-de-datos.png) | El flujo apunta al sitio desplegado, con el ID de medición `G-P8EWE6D7G3` |
| ![Acceso del profesor](assets/ga4/02-acceso-del-profesor.png) | Rol de Analista otorgado a `j.aranda@utem.cl` |
| ![Eventos del embudo](assets/ga4/03-eventos-del-embudo.png) | Los cuatro eventos exigidos: `view_item`, `add_to_cart`, `begin_checkout`, `purchase` |
| ![Evento propio](assets/ga4/04-evento-propio.png) | `compra_sin_stock`, evento no estándar definido para este trabajo, verificado en Tiempo real |

El cuarto evento merece una nota: `compra_sin_stock` no pertenece al esquema de comercio
electrónico de GA4. Se definió porque bajo carga el inventario se agota y la conversión cae;
sin ese evento, la caída aparecería en el embudo **sin causa identificable**. Es
instrumentación diseñada para responder una pregunta concreta del análisis, no para completar
un requisito.

**Cómo se verificó, y lo que eso reveló.** El evento solo se dispara cuando `/api/checkout`
devuelve **409**, es decir cuando el stock se agota *entre* que el artículo entra al carrito y
que se confirma el pago. Que una talla aparezca tachada en la ficha no lo dispara: ahí el
botón está deshabilitado y nunca se pide la compra.

Para verificarlo se forzó la condición: se agregó la variante `PSD-9-13-1` al carrito, se
dejó su stock en cero en la base, y se confirmó el pago. La aplicación respondió *«Se agotó el
stock de PSD-9-13-1 mientras pagabas»*, el contador `pisada_compras_sin_stock_total` pasó de 0
a 1 y el evento apareció en GA4. El stock se repuso enseguida.

El primer intento se hizo desde un navegador con bloqueador de anuncios y **GA4 no registró
nada**: ni el evento ni la sesión. El contador del servidor sí subió. Repetido en un navegador
limpio, GA4 lo registró de inmediato.

Esa diferencia es un dato del trabajo, no una anécdota: **la medición del lado del cliente es
censurable por el cliente**, y la del servidor no. Es la misma limitación que §5.7 documenta
para k6 —que no ejecuta JavaScript y por eso es invisible para GA4— vista desde otro ángulo.
Por eso el trabajo no descansa solo en GA4: cada evento del embudo tiene su contador
equivalente en `/api/metricas`.

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

![Percentiles por escenario](graficos/percentiles-escenarios.svg)

| Escenario | VU | Mediana | p(95) | p(99) | Throughput | Error |
|---|---|---|---|---|---|---|
| Baja | 5 | 20,02 ms | 54,03 ms* | 118,61 ms* | — | 0,00 % |
| Normal | 25 | 18,44 ms | **35,30 ms** | 48,34 ms | 4,94 req/s | 0,00 % |
| Pico | 350 | 66,54 ms | **1.560 ms** | 2.330 ms | 29,51 req/s | 0,01 % |

\* **El p(95) de la carga baja no es confiable.** Ese escenario genera solo 235 peticiones,
de modo que el percentil se calcula sobre unas 12 muestras en la cola y un par de peticiones
lentas lo desplazan por completo. Para la línea base debe usarse la **mediana** (20,02 ms),
que sí es estable y coincide con los 21 ms medidos directamente. Se declara en lugar de
reportar un percentil que la cantidad de muestras no sostiene.

De 5 a 25 usuarios el tiempo de respuesta **no se movió**. En el pico el p(95) se multiplica
por **44** respecto de la carga sostenida. El sistema **no colapsó**: 4 fallas en 24.792
peticiones, un 0,01 %.

### 5.2 Curva de utilización

![Utilización de CPU frente a usuarios concurrentes](graficos/utilizacion-cpu.svg)

![CPU por usuario](graficos/cpu-por-usuario.svg)

| Usuarios | CPU | Pool en espera (máx) | CPU por usuario |
|---|---|---|---|
| 25 | 10,4 % | 4 | 0,416 % |
| 50 | 17,8 % | 4 | 0,356 % |
| 100 | 31,8 % | 4 | 0,318 % |
| 200 | 61,3 % | **40** | 0,307 % |
| **350** | **96,6 %** | **222** | **0,276 %** |

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

### 5.4 Memoria y latencia del event loop

| Métrica | Mínimo | Máximo |
|---|---|---|
| Memoria residente | 294,3 MB | 295,6 MB |
| Heap de V8 en uso | 60,9 MB | 114,5 MB |
| Latencia del event loop, p(99) | 15,76 ms | 22,32 ms |

**La memoria no es cuello de botella:** 295 MB sobre un límite de 512 MB, con una variación de
1,3 MB bajo carga que descarta fugas.

El dato relevante es la **latencia del event loop**: un p(99) de 15 a 22 ms significa que, en
el 1 % peor, una tarea esperó ese tiempo solo para empezar a ejecutarse. Es una **tercera
cola**, junto al bloqueo de stock y al pool de conexiones: Node procesa en un solo hilo, y con
1 CPU asignada ese hilo no puede escalar.

El sistema tiene entonces **tres puntos de serialización encadenados**, y la saturación de
cualquiera se propaga a los demás.

*I/O de disco no se midió: no participa del camino crítico, ya que el catálogo cabe en la
caché de PostgreSQL. Se declara en §8.6.*

### 5.5 Costo de las consultas

| Consulta | Ejecuciones | Tiempo medio |
|---|---|---|
| `catalogo_listado` | 12.589 | 8,49 ms |
| `catalogo_conteo` | 12.589 | **4,55 ms** |
| `producto_variantes` | 9.380 | 4,66 ms |
| `carrito_items` | 2.962 | 5,29 ms |

El `COUNT(*)` de la paginación cuesta **un 54 % de lo que cuesta el listado completo**, sin
devolver una sola fila de datos.

### 5.6 Ley de Amdahl sobre el checkout

![El techo de Amdahl cae con la contención](graficos/techo-amdahl.svg)

| Escenario | Wq | Checkout | Fracción serie | Techo |
|---|---|---|---|---|
| Carga normal, SKU al azar | 3,2 ms | 44,9 ms | 7,2 % | **13,9x** |
| Contención, pesimista | 45,4 ms | 353,9 ms | 12,8 % | **7,8x** |
| Contención, optimista | 35,2 ms | 166,4 ms | 21,2 % | **4,7x** |

Por mucha CPU que se agregue, el checkout no puede mejorar más que ese techo. **Bajo
contención el techo se desploma a menos de 5x.** Reducirlo exige cambio de diseño, no más
hardware.

### 5.7 Indicadores de experiencia de usuario

Medidos sobre el **sitio desplegado**, desde Chile, con un navegador real que ejecuta
JavaScript y dispara los eventos de GA4.

#### El problema metodológico y cómo se resolvió

**k6 no ejecuta JavaScript.** Es un cliente HTTP: descarga el HTML pero no corre los scripts
de la página. Su tráfico, por lo tanto, **no genera un solo evento en GA4**.

Eso tiene una consecuencia directa sobre lo que pide la Fase 2: la comparación de la
experiencia de usuario "en condiciones normales frente a bajo carga generada" **no sale de
forma automática**. Hace falta que un cliente real navegue mientras k6 carga el servidor.

El protocolo aplicado separa los dos roles:

| Rol | Herramienta | Qué mide |
|---|---|---|
| Carga de fondo | k6, 12 usuarios virtuales | Plano A: servidor |
| Usuario observado | Navegador real recorriendo el embudo | Plano B: experiencia |

#### Resultados: la misma navegación, con y sin carga

Mediana de 5 repeticiones por página, en milisegundos:

| Página | Control | Bajo carga | Degradación |
|---|---|---|---|
| Home | 288,8 | 304,2 | **1,05x** |
| Catálogo | 393,8 | **989,1** | **2,51x** |
| Catálogo con filtros | 310,4 | 302,7 | 0,98x |
| Ficha de producto | 194,3 | 218,4 | 1,12x |

**El hallazgo es la degradación diferenciada.** Bajo la misma carga:

- El **home se mantiene prácticamente igual** (+5 %)
- El **catálogo se degrada dos veces y media**

Esto **confirma empíricamente la decisión D-02**, que fue dar a cada página un peso distinto a
propósito. La página que ejecuta tres consultas con agregación sobre 4552 variantes es la que
primero acusa la carga; la que hace una sola consulta acotada apenas la nota.

> El catálogo **con filtros** no se degradó. Es coherente con lo observado en §5.5: el filtro
> reduce el conjunto sobre el que hay que agregar, de modo que resulta más barato que el
> listado completo. Bajo carga esa diferencia se amplifica.

#### Operaciones del embudo bajo carga

| Operación | Tiempo |
|---|---|
| Agregar al carrito | 168,0 ms |
| Checkout completo | 178,8 ms |

El checkout respondió `200` y creó el pedido correctamente incluso con la carga encima. A
este nivel (12 usuarios virtuales) la contención sobre el stock todavía no se manifiesta,
porque los usuarios sintéticos compran productos distintos.

#### Eventos registrados en GA4

Durante ambas sesiones se dispararon los cuatro eventos del embudo exigidos por el enunciado,
más el evento propio:

| Evento | Cuándo |
|---|---|
| `view_item` | Al abrir una ficha de producto |
| `add_to_cart` | Al agregar una talla |
| `begin_checkout` | Al iniciar el pago |
| `purchase` | Al confirmarse, con `transaction_id` y valor en CLP |
| `compra_sin_stock` | *(propio)* al rechazarse por inventario agotado |

Se completaron **4 compras reales** en la propiedad (pedidos 9, 10, 11 y 16).

#### Limitación declarada

Las métricas de engagement que calcula GA4 por su cuenta —tasa de rebote, duración de sesión,
páginas por sesión y Core Web Vitals— **requieren un volumen de sesiones que estas corridas no
alcanzan**, y GA4 demora hasta 24 horas en consolidarlas.

Las cifras de esta sección provienen de la medición directa en el navegador, que es más
precisa para el propósito del análisis: entrega el tiempo exacto de cada página en cada
condición, mientras que GA4 entregaría promedios agregados sobre pocas sesiones.

Se declara como limitación en lugar de presentar cifras de GA4 con respaldo insuficiente.


---

## 6. Análisis de cuellos de botella

### 6.1 El punto de saturación, medido

**Con 350 usuarios virtuales la utilización de CPU llega al 96,6 %.** El sistema alcanza su
punto de saturación dentro del rango de carga ensayado.

No siempre fue así. Con una versión más liviana de las páginas, la utilización máxima
observada fue de 76,1 % y hubo que **proyectar** la saturación hacia ~503 usuarios,
declarándola como estimación. Al aumentar el peso de las páginas —sin agregar ni una consulta
ni una petición de red— **la saturación entró en el rango medible**.

> **El peso de las páginas determina el punto de saturación.** Mismo hardware, mismo
> generador, mismos escenarios: lo único que cambió fue cuánto cuesta renderizar cada página,
> y con eso el punto de saturación se movió de más de 500 usuarios a 350.

Esto convierte el aligeramiento de páginas en una **estrategia de capacidad**, no solo en una
mejora de experiencia. Y es un análisis de sensibilidad en el sentido estricto de la Cátedra
1.1: se varió un parámetro y se observó el desplazamiento del punto de operación. Detalle en
`docs/hallazgos.md`, E-12.

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

**Confirmado el 17 de noviembre.** La cola sobre el pool se midió directamente:

| Usuarios | Peticiones esperando conexión |
|---|---|
| 100 | 4 |
| 200 | **40** |
| 350 | **222** |

Con 350 usuarios hay **222 peticiones encoladas esperando una de las 10 conexiones**: una cola
22 veces más larga que el pool completo. El crecimiento es explosivo —4, 40, 222— y acompaña
a la CPU acercándose a su límite.

El pool no es un detalle de configuración: **es el recurso que primero se agota**.

**La intervención no confirmó la causalidad.** Una primera medición sugirió que duplicar el
pool a 20 conexiones hacía desaparecer la cola y reducía el p(95) por un factor de 5,9, lo que
habría cerrado la cadena causal. Al repetir el experimento tres veces por configuración ese
efecto **no se reprodujo** (§7.5 y `hallazgos.md`, E-16). Por lo tanto: la cola de admisión al
pool está **medida** como fenómeno, pero **no está demostrada como causa** de la degradación
del p(95). Sigue siendo la hipótesis más plausible —el mecanismo es coherente y el recurso se
agota de forma verificable— y queda como hipótesis, no como conclusión.

---

## 7. Propuestas de mejora

Ordenadas por relación entre impacto y costo.

### 7.1 El conteo de la paginación — propuesta PROBADA Y REFUTADA

**Evidencia inicial:** 4,55 ms por petición, el 54 % del costo del listado, sin devolver datos.

**Propuesta original:** reemplazar el `COUNT(*)` exacto por una estimación desde
`pg_class.reltuples`.

**Se implementó y se midió. No funciona.**

| | Conteo exacto | Conteo estimado |
|---|---|---|
| Costo de la consulta | 5,03 ms | **4,96 ms** |
| p(95) de la página | 31,31 ms | **52,29 ms** |

**Por qué la propuesta estaba equivocada.** El razonamiento asumía que esos milisegundos eran
*trabajo de cómputo*. Con 240 productos, contar es trivial: los ~5 ms son **costo fijo por
consulta** —viaje de ida y vuelta, planificación, manejo del resultado—. Reemplazar una
consulta barata por otra consulta barata no ahorra nada.

**Lo que sí serviría** es *eliminar* la consulta, no abaratarla: paginación por cursor,
cachear el total por combinación de filtros, o reemplazar el paginador por un "cargar más".

> El número era correcto; la **interpretación** del número era falsa. Detalle en
> `docs/hallazgos.md`, E-14.

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

### 7.5 Subir el pool de conexiones de 10 a 20 — PROPUESTA REFUTADA POR REPETICIÓN

Esta sección documenta el error de método más importante del trabajo, y se deja escrita como
error porque enseña más que el hallazgo que pretendía reportar.

**Lo que se midió primero (E-15, 16 de noviembre).** Se ejecutó el escenario de pico completo
con `PG_POOL_MAX` en 5, 10 y 20, **una corrida por configuración**:

| Pool | Mediana | p(95) | p(99) | Peticiones en espera (máx) |
|---|---|---|---|---|
| 5 | 49,59 ms | 1.000 ms | 1,53 s | 141 |
| 10 | 36,73 ms | 916 ms | 2,38 s | 380 |
| 20 | 28,99 ms | 155,6 ms | 228,76 ms | 4 |

Sobre esa base se concluyó que duplicar el pool reducía el p(95) por un factor de 5,9, se
cambió el valor por defecto en `db.ts`, `.env.example` y `render.yaml`, se graficó el hallazgo
y se escribió en el resumen ejecutivo que era *la mejora de mayor impacto por menor costo de
todo el trabajo*. La propia sección advertía, eso sí, que cada configuración se había medido
una sola vez.

**Lo que mostró la repetición (E-16, 17 de noviembre).** La auditoría interna (§hallazgo A-3
en `docs/auditoria-final.md`) marcó esa corrida única como riesgo y se repitió el experimento
**tres veces por configuración**, con el mismo escenario, el mismo hardware y el mismo
procedimiento de resembrado entre corridas:

| Pool | n | p(95) mínimo | p(95) máximo | p(95) mediano |
|---|---|---|---|---|
| 5 | 3 | 130,2 ms | 275,6 ms | 138,3 ms |
| 10 | 3 | 144,4 ms | 165,7 ms | 152,8 ms |
| 20 | 2 | 140,1 ms | 162,0 ms | ~151 ms |

**Los tres rangos se solapan por completo.** No hay diferencia demostrable entre pool 5, 10 y
20 en este sistema. El factor 5,9 **no se reproduce**: ninguna de las ocho corridas válidas
superó los 276 ms, mientras que la medición original había dado 916 ms y 1.000 ms con las
configuraciones supuestamente peores.

*(La novena corrida —pool 20, repetición 3— se descartó: Docker se había detenido y la
aplicación respondió HTTP 500 al 100 % de las peticiones. La fila queda comentada en
`carga/resultados/pool-repeticiones.tsv` en lugar de borrada. Con pool 20 ya dentro del mismo
rango que las otras dos configuraciones en sus dos corridas válidas, una tercera no habría
cambiado el veredicto.)*

**Qué se revirtió.** `PG_POOL_MAX` vuelve a 10 en `db.ts`, `web/.env.example` y `render.yaml`,
con el motivo escrito en cada archivo. El gráfico `tamano-pool.svg` se retiró del informe.

**La pregunta abierta, que vale más que el hallazgo.** ¿Por qué el 16 de noviembre las mismas
configuraciones dieron 916 y 1.000 ms, y el 17 ninguna pasó de 276 ms? La diferencia **entre
días** es mayor que cualquier efecto atribuible al pool. Las hipótesis que quedan sin
discriminar son: estado de la caché de PostgreSQL y del sistema de archivos al momento de cada
corrida, carga ajena en el equipo de desarrollo (es una máquina de uso general, no un banco de
pruebas aislado), y el estado del catálogo según cuántas compras había absorbido la base antes
de resembrar. Ninguna se midió, y por eso ninguna se afirma.

**La lección metodológica.** Una diferencia grande no es una diferencia robusta. El factor 5,9
parecía inmune al azar justamente por ser grande —ese fue el razonamiento explícito al
aceptarlo— y resultó ser variabilidad entre corridas. En un sistema con colas, la varianza
entre ejecuciones de la *misma* configuración es ella misma un resultado a medir, no un ruido
que se promedia. El protocolo correcto es el que se aplicó en §8.4 para las estrategias de
concurrencia: repetir, publicar el rango y declarar no concluyente cuando los rangos se tocan.

**Lo que sí sigue en pie.** La cola de admisión al pool existe y se midió (§6.2): 4, 40 y 222
peticiones esperando con 100, 200 y 350 usuarios. Que el pool se encole está medido; que
agrandarlo mejore el tiempo de respuesta, no.

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

**Conclusión honesta: no se puede determinar qué estrategia es mejor.**

Se repitió el experimento con **cinco repeticiones por estrategia a 40 usuarios**, fuera del
régimen inestable. La varianza bajó de 524x a 7,3x, pero **los rangos siguen solapándose en
las tres métricas centrales** (p(95), media y throughput), y la mediana favorece a una
estrategia en unas métricas y a la otra en otras.

Se observa un patrón en las colas —la pesimista tuvo dos excursiones con p(99) sobre 14 s,
la optimista ninguna— pero dos casos en cinco corridas **no alcanzan para afirmarlo**.
Confirmarlo exigiría del orden de veinte repeticiones. Detalle en `docs/hallazgos.md`, E-13.

### 8.5 El sandbox de pago se integró como camino paralelo

El enunciado pedía *"checkout simulado con sandbox de algún medio de pago disponible en
Chile"*. Se integró **Transbank Webpay Plus** en su ambiente de integración, verificado de
extremo a extremo: transacción creada, pago con tarjeta de prueba, autenticación bancaria,
confirmación y creación del pedido.

**Convive con el checkout propio en lugar de reemplazarlo**, y la razón está respaldada por
medición: las llamadas a Transbank suman **537 ms** (160 ms crear + 377 ms confirmar) frente a
los ~50 ms del checkout propio. Someter ese camino a carga significaría que el **91 % del
tiempo medido sería ruido de un tercero**, enterrando por completo la contención sobre el
stock —3,23 ms— que es el objeto de estudio.

Además, k6 no puede recorrer un flujo con redirección a un sitio externo y autenticación
bancaria, de modo que el escenario de contención sería imposible de ejecutar.

Ambos caminos **comparten la misma función de descuento de inventario**: cambia el medio de
pago, no el tratamiento del recurso crítico. Detalle en `docs/hallazgos.md`, E-11.

### 8.6 Formato del registro de prompts

El enunciado indica que los prompts deben registrarse *"con un formulario que se adjunta"*.
**Ese formulario no estaba entre los archivos del curso a los que tuvimos acceso.**

Ante la ausencia, se adoptó el formato del **repositorio de ejemplo del propio profesor**
(`github.com/jabtools/tiempo`), que registra por entrada: fecha, agente y modelo utilizado,
prompt completo y resumen de los cambios generados. Se agregaron dos campos propios,
`Defectos conocidos` y `Propuestas no aprobadas`, siguiendo también ese ejemplo.

El registro está en `logs/prompts.md`, con 15 entradas que cubren todo el desarrollo.

### 8.7 El techo de Amdahl se midió antes del rediseño

La fracción serializada del checkout —7,2 %, de la que sale el techo de 13,9x— se midió el 4
de noviembre, **antes del rediseño** que aumentó el peso de las páginas y obligó a repetir el
resto de las mediciones.

El checkout no se modificó y su ruta (`/api/checkout`) no devuelve HTML, de modo que el
rediseño no debería haberla afectado. **Pero no se volvió a medir**, y se declara en lugar de
presentarla como contemporánea del resto.

**Intento de remedición y por qué no sirve.** El 17 de noviembre se intentó cerrar esta
limitación, y el script quedó mal diseñado: ejecutó el escenario de **contención** (40 usuarios
sobre un solo SKU) en lugar del escenario de carga normal con SKU aleatorios. Lo que midió
—espera media de bloqueo de 271,7 ms sobre un checkout de 438,15 ms, es decir ≈62 % de fracción
serializada— es el caso de alta contención, **no comparable** con el 7,2 % original. Confirma
el orden de magnitud que ya reportaba §5.6 para contención (techo bajo 5x), pero la limitación
sobre el 7,2 % en carga normal **sigue abierta**.

### 8.8 Se publicó como confirmado un hallazgo que no resistió la repetición

El tamaño del pool se midió una vez por configuración, la diferencia fue grande, y eso se tomó
como suficiente: se cambiaron los valores por defecto del proyecto, se graficó el resultado y
se escribió en el resumen ejecutivo que era la mejora de mayor impacto del trabajo. La
repetición posterior lo refutó. El caso completo está en §7.5.

El error no fue medir mal una corrida —la corrida fue correcta— sino **tratar una magnitud
grande como garantía de robustez**. Es exactamente el error que §8.4 ya había documentado para
las estrategias de concurrencia, cometido de nuevo tres días después sobre otra variable.

### 8.9 Otras limitaciones

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

6. **Medir correctamente es más difícil que medir.** Cinco de los hallazgos de este trabajo
   fueron errores de método propios. Dos son del mismo tipo y conviene leerlos juntos: los
   resultados de contención **no son reproducibles** (§8.4), y el hallazgo sobre el tamaño del
   pool —publicado como confirmado, con un factor de 5,9— **tampoco se reprodujo al repetirlo**
   (§7.5). En un sistema con colas, la varianza entre corridas de la misma configuración es un
   resultado a medir, no un ruido a promediar. Una diferencia grande no es una diferencia
   robusta: eso se aprendió refutando una conclusión propia ya escrita.

---

## Anexos

- `docs/hallazgos.md` — bitácora de los cinco experimentos
- `docs/marco-teorico.md` — traducción del formalismo del ramo a las métricas del sistema
- `docs/decisiones.md` — las ocho decisiones de diseño y su justificación
- `carga/escenarios/` — scripts de k6
- `carga/resultados/` — reportes de las corridas
- `logs/prompts.md` — registro de prompts exigido por el enunciado
