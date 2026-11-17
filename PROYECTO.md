# Pisada — documento maestro del proyecto

Visión completa del trabajo en un solo archivo: qué se construyó, por qué, qué se midió, qué
se encontró y qué quedó fuera.

**Ramo:** INFB8091 Desempeño de Sistemas · UTEM · 2º semestre 2026
**Profesor:** Javier Aranda
**Sitio:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada
**GA4:** `G-P8EWE6D7G3`
**Integrantes:**

| # | Nombre |
|---|---|
| 1 | Catalina Emilia Araniz Arancibia |
| 2 | Gabriel Ignacio Araya López |
| 3 | Bianca Paola Torres Rivadeneira |
| 4 | Lucas Ángel Mora Loiza |
| 5 | Matías Torres Estay |

---

## 1. Qué es esto

**Pisada** es una tienda de comercio electrónico de zapatillas e indumentaria urbana.

La tienda **no es el objetivo**: es el sujeto de estudio. El trabajo consiste en **evaluar el
desempeño de un sitio web bajo distintas condiciones de carga**, y explicar lo observado con
el formalismo del ramo: análisis operacional (Unidad 2) y teoría de colas (Unidad 3).

### La decisión que define todo el trabajo

El inventario vive a nivel de **SKU**: producto + talla + color. 240 productos producen
**4552 variantes**, cada una con su propio stock.

Esa decisión convierte el descuento de inventario en un **recurso serializado**: dos compras
del mismo SKU no pueden ejecutarse en paralelo sin coordinación. Bajo concurrencia se forma
una **cola de espera real**, medible, sobre la que se puede aplicar teoría de colas con datos
propios en lugar de ejercicios de pizarrón.

---

## 2. Arquitectura

```
Navegador ──HTTP──> Next.js (App Router) ──pool pg──> PostgreSQL 16
                         │                                 │
                         ├── /api/carrito                  ├── producto (240)
                         ├── /api/checkout                 ├── variante (4552)
                         ├── /api/auth                     ├── carrito / pedido
                         └── /api/metricas ──> Prometheus  └── usuario / sesion
```

### Las ocho decisiones de diseño

| # | Decisión | Por qué |
|---|---|---|
| D-01 | E-commerce, no sitio de servicios | La Fase 2 pide el embudo de conversión, que es propio del comercio |
| D-02 | Zapatillas con variantes | Produce contención real sobre el stock |
| D-03 | Next.js + PostgreSQL | Consultas con filtros y paginación que se degradan de verdad |
| D-04 | Contenedor, **no serverless** | Serverless no expone la utilización de recursos que hay que medir |
| D-05 | k6 | Entrega percentiles de fábrica; los scripts se versionan |
| D-06 | **REST, no Server Actions** | Las Server Actions llevan un id cifrado que cambia en cada build; k6 no las puede invocar de forma estable |
| D-07 | El stock se descuenta al pagar | Reservar al agregar al carrito desplazaría la contención fuera del checkout |
| D-08 | Orden global de bloqueo | Evita interbloqueos entre transacciones concurrentes, por construcción |

**SQL directo, sin ORM.** El trabajo analiza el costo de las consultas; un ORM las genera y
las esconde, además de dificultar el `SELECT ... FOR UPDATE` explícito.

### Las cinco estaciones de servicio

Siguiendo el modelo del servidor central de la Cátedra 1.1:

| Estación | Recurso | Métrica |
|---|---|---|
| E1 | CPU de aplicación | `process_cpu_seconds_total` |
| E2 | Pool de 10 conexiones | `pool_conexiones`, `espera_conexion_segundos` |
| E3 | CPU de base (1 núcleo) | `docker stats` |
| **E4** | **Bloqueo de stock** | `espera_bloqueo_stock_segundos` |
| E5 | Terminales (think time Z) | k6 |

E4 es un **M/M/1/∞/∞/FCFS** en notación de Kendall. No es una cola: son **4552 colas
independientes**, una por SKU.

---

## 3. Metodología

### Modelo de carga: CBMG

Los usuarios sintéticos transitan entre estados con probabilidades, no siguen un guion fijo:

| Desde | Hacia | Probabilidad |
|---|---|---|
| producto | carrito | 0,12 |
| producto | catálogo | 0,33 |
| producto | otro producto | 0,20 |
| producto | salir | 0,35 |
| carrito | checkout | 0,55 |

Conversión resultante: **6,8 %** (5 compras en 74 sesiones).

> **Conexión teórica.** Las probabilidades del CBMG **son** las razones de visita `Vᵢ` de la
> ley del flujo forzado. El modelo de carga web y las leyes operacionales describen el mismo
> modelo desde dos ángulos.

### Escenarios

| Escenario | Usuarios | Propósito |
|---|---|---|
| `baja.js` | 5 | Línea base |
| `normal.js` | 25 | Operación habitual |
| `pico.js` | 25→350 en escalones | Punto de saturación |
| `contencion.js` | hasta 120, **un mismo SKU** | Cola sobre el stock |

### Clasificación de respuestas

`200` compra · `409` sin stock, **resultado de negocio, no error** · `503` conflicto · `5xx`
falla real.

Contar los `409` como errores llevaría a concluir que el sistema falla cuando está agotando
inventario.

---

## 4. Resultados

### Los tres escenarios

| Escenario | VU | p(95) | p(99) | Throughput | Error |
|---|---|---|---|---|---|
| Baja | 5 | 54,03 ms* | 118,61 ms* | — | 0,00 % |
| Normal | 25 | 35,30 ms | 48,34 ms | 4,94 req/s | 0,00 % |
| Pico | 350 | **1.560 ms** | 2.330 ms | 29,51 req/s | 0,01 % |

\* Solo 235 peticiones: el percentil no es confiable. Usar la mediana, 20,02 ms.

### Curva de utilización

| VU | CPU | Pool en espera (máx) | CPU por usuario |
|---|---|---|---|
| 25 | 10,4 % | 4 | 0,416 % |
| 50 | 17,8 % | 4 | 0,356 % |
| 100 | 31,8 % | 4 | 0,318 % |
| 200 | 61,3 % | **40** | 0,307 % |
| 350 | **96,6 %** | **222** | **0,276 %** |

**La CPU por usuario decrece**: cada usuario pasa proporcionalmente más tiempo esperando que
siendo atendido. Es la firma del encolamiento, y aparece **antes** de que la latencia se
degrade.

### Leyes verificadas sobre datos propios

**Ley de Utilización** `U = X · S`:
```
B = 298,1 s · T = 850 s · C = 26.447
U = 35,1 %   X = 31,11 pet/s   S = 11,27 ms de CPU por petición
Comprobación: 31,11 × 0,01127 = 35,1 %  ✓
```

**Ley de Little** `Lq = X · Wq`, sobre la cola del bloqueo:
```
pesimista:  13,85 compras/s × 45,4 ms = 0,63 transacciones en cola
optimista:  22,58 compras/s × 35,2 ms = 0,79 transacciones en cola
```

**Ley de Amdahl** sobre el checkout:

| Escenario | Fracción serializada | Techo |
|---|---|---|
| Carga normal | 7,2 % | **13,9x** |
| Contención, pesimista | 12,8 % | 7,8x |
| Contención, optimista | 21,2 % | **4,7x** |

### Costo de las consultas

| Consulta | Tiempo medio |
|---|---|
| `catalogo_listado` | 8,49 ms |
| **`catalogo_conteo`** | **4,55 ms** — el 54 % del listado, sin devolver una fila |
| `producto_variantes` | 4,66 ms |

### Local frente a producción

| | Local (1 CPU) | Producción (0,1 CPU) |
|---|---|---|
| Mediana con 5 usuarios | 20,02 ms | **333,93 ms** |
| p(95) con 5 usuarios | 54,03 ms* | **1,53 s** |

\* Con 235 peticiones el p(95) no es estable; la referencia válida es la mediana.

Descontados los ~307 ms de red, el servidor aporta 1,2 s con carga mínima. **Se degrada 30
veces.** Es un análisis de sensibilidad involuntario: el mismo sistema, dos configuraciones de
recursos, puntos de saturación que difieren en un orden de magnitud.

### Descomposición del tiempo que percibe un usuario chileno

```
TTFB total (catálogo)  = 348 ms
Servidor (medido)      =  41 ms   ← 12 %
Red (por diferencia)   = 307 ms   ← 88 %
```

---

## 5. El hallazgo central

**El cuello de botella no es el recurso obvio.**

No es la CPU ni la base de datos: es el **pool de conexiones**, y llega ahí por **contagio**.

```
1. Las transacciones se encolan sobre la fila del SKU
2. Mientras esperan, RETIENEN su conexión del pool
3. El pool de 10 se agota
4. Las peticiones nuevas esperan una conexión  ← segunda cola
5. Algunas superan el tiempo límite y fallan
6. Al liberarse, la carga acumulada vuelve a saturar el pool
```

**Un recurso serializado contagia su saturación a un recurso compartido.** La contención
sobre una sola fila degrada todo el sitio, incluidas páginas que no tienen relación con ese
producto.

Esto explica que la mediana se mantenga sana (~13 ms) mientras el p(95) se va a segundos: la
mayoría de las peticiones pasa bien y una cola larga queda atrapada.

---

## 6. Propuestas de mejora

| # | Propuesta | Evidencia |
|---|---|---|
| 1 | Eliminar el `COUNT(*)` exacto de la paginación | 4,55 ms, 54 % del listado, sin devolver datos |
| 2 | No retener la conexión mientras se espera el bloqueo | Sección 5 de este documento |
| 3 | Repartir el inventario de los SKU populares en varias filas | El techo de Amdahl cae bajo 5x |
| 4 | Índice GIN con `pg_trgm` para la búsqueda | El `ILIKE` se dejó sin índice a propósito para medirlo |
| 5 | Ajustar `PG_POOL_MAX` | Es un parámetro de capacidad, no un detalle |

---

## 7. Errores metodológicos propios

Cuatro equivocaciones cometidas, detectadas y corregidas durante el trabajo. Se documentan
porque son parte del resultado.

### 7.1 El generador no ejercitaba el checkout

`extraerVariantes()` descartaba **todos** los botones de talla: comprobaba si la etiqueta
contenía el texto `disabled`, y las clases de Tailwind incluyen `disabled:cursor-not-allowed`.

> **Un generador con un defecto silencioso no falla: miente.** Esa corrida habría reportado
> tiempos excelentes y cero errores, concluyendo que el sistema aguanta bien, cuando nunca
> ejercitó el camino caro.

### 7.2 El recurso medido se agotó a mitad del experimento

La primera corrida de contención vendió las 3000 unidades y la segunda mitad midió **rechazos
rápidos en vez de compras**, dando un checkout *más rápido* bajo contención.

### 7.3 El instrumento no medía lo mismo en ambas estrategias

El histograma de espera cubría solo el `SELECT ... FOR UPDATE` en la estrategia pesimista,
pero toda la función en la optimista. La comparación estaba sesgada **por construcción**.

### 7.4 Los resultados de contención no son reproducibles

Entre dos tandas idénticas, el p(95) varió **dos órdenes de magnitud** y el orden entre
estrategias se invirtió:

| Métrica | Tanda 1 | Tanda 2 |
|---|---|---|
| pesimista p(95) | 63,88 ms | 7,85 s |
| optimista p(95) | 9,96 s | 49,63 ms |

> **Con la evidencia disponible no se puede determinar qué estrategia es mejor.** Se deja
> registrado así en lugar de elegir la corrida que confirmaba la hipótesis.

---

## 8. Otras limitaciones declaradas

- **Las llegadas no son de Poisson.** k6 lanza usuarios en escalones, más sincronizados que
  aleatorios. M/M/1 es una aproximación útil, no exacta.
- **El equilibrio de flujo no se cumple en las rampas.** Los cálculos operacionales valen
  sobre las mesetas.
- **k6 no ejecuta JavaScript**, de modo que su tráfico no genera eventos en GA4.
- **El punto de saturación se alcanzó y se midió:** 96,6 % de CPU con 350 usuarios. Con una
  versión más liviana de las páginas no se alcanzaba y hubo que proyectarlo.
- **No se integró un sandbox de pago**, que el enunciado pedía. Ver `docs/auditoria.md` B-01.

---

## 9. Mapa del repositorio

| Ruta | Contenido |
|---|---|
| `docs/informe-fase1.md` | **Informe técnico** |
| `docs/hallazgos.md` | Bitácora de los 8 experimentos |
| `docs/marco-teorico.md` | Formalismo del ramo aplicado al sistema |
| `docs/decisiones.md` | Las 8 decisiones de diseño |
| `docs/auditoria.md` | Cumplimiento del enunciado |
| `docs/guion-video.md` | Guion del video |
| `docs/manual-ejecucion.md` | Comandos para operar las mediciones |
| `docs/despliegue.md` | GA4, base de datos y despliegue |
| `docs/graficos/` | 5 gráficos SVG |
| `logs/prompts.md` | **Registro de prompts** |
| `carga/escenarios/` | Scripts de k6 |
| `carga/resultados/` | Reportes de las corridas |
| `web/db/esquema.sql` | Modelo de datos |
| `web/src/lib/checkout.ts` | **El núcleo: las dos estrategias de concurrencia** |
| `AGENTS.md` | Reglas de trabajo del agente |

---

## 10. Cómo ejecutarlo

```bash
docker compose up -d
```

```bash
cd web && npm install && cp .env.example .env && npm run semilla
```

```bash
npm run build && npm run start
```

Sitio en `http://localhost:3000`, métricas en `/api/metricas`.

```bash
k6 run carga/escenarios/baja.js
```

Detalle completo en `docs/manual-ejecucion.md`.
