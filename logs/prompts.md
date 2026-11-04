# Log de prompts y cambios — Cumbre Café

Registro obligatorio exigido por el enunciado del trabajo semestral de
**INFB8091 — Desempeño de Sistemas** (UTEM, 2026-2).

Cada entrada deja constancia del prompt solicitado, el agente y modelo que lo atendió, y un
resumen de lo que ese prompt generó. Las entradas se agregan **al final**, en orden cronológico.

**Formato:**
```
## YYYY-MM-DD HH:mm | agente: <nombre> (<modelo>)
- **Prompt:** <texto solicitado por el usuario>
- **Cambios:** <resumen de archivos creados/modificados>
- **Defectos conocidos:** <lo que quedó sin corregir>        (opcional)
- **Propuestas no aprobadas:** <lo que se propuso y se rechazó>  (opcional)
```

---

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "tengo un proyecto universitario, te mandare todo material que tengamos en cavas,
  ya sea materia y contenido, para poder desarrollar de buena forma el proyecto semestral de
  este ramo." Seguido del envío del material del curso: bitácora (imagen), programa y objetivos
  (texto de Canvas), `Catedra 1.0 Introducción al Curso INFB8091 2026-2.ppt` y
  `Catedra 1.1 Etapas de la Modelación-SEM2-2026.pdf`.
- **Cambios:**
  - Creada la estructura de trabajo del ramo: `material/catedras/`, `material/libros/`,
    `enunciado/`, `proyecto/`.
  - Copiadas las cátedras a `material/catedras/`.
  - Creado `NOTAS.md` con el programa del ramo, los 8 objetivos específicos, la bitácora
    completa con fechas y la fórmula de evaluación, y la transcripción íntegra de la
    Cátedra 1.1 (etapas de la modelación, agente monitor, análisis de sensibilidad).
- **Defectos conocidos:** la Cátedra 1.0 es un `.ppt` binario de Office 97 del que no se pudo
  extraer el texto (no hay PowerPoint ni librería compatible en el equipo). Queda pendiente
  re-exportarla como PDF desde Canvas.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** Envío de `Catedra 1.2 Consolidacion de La Evaluacion del Rendimiento-SEM2-2026.pdf`
  y una segunda copia de la Cátedra 1.1, con la indicación "estos son para el proyecto".
- **Cambios:**
  - Copiada la Cátedra 1.2 a `material/catedras/`. Se verificó por hash que la segunda copia
    de la Cátedra 1.1 era idéntica a la ya existente; no se duplicó.
  - `NOTAS.md`: agregada la sección 4 con la Cátedra 1.2 completa — carga vs. workload, tiempo
    de respuesta y throughput, las tres técnicas de evaluación, fórmulas de aceleración y
    relación rendimiento/costo con sus ejemplos numéricos, y las leyes de **Amdahl** y
    **Gustafson** con sus casos resueltos.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** Envío de `Trabajo 1 Semestre 2 - 2026.pdf` (enunciado) y
  `Modelos de Carga en la Web.pdf`, más el enlace https://github.com/jabtools/tiempo
  con la aclaración "perdón me equivoqué".
- **Cambios:**
  - Copiado el enunciado a `enunciado/` y el PDF de modelos de carga a `material/catedras/`.
  - Creado `enunciado/TRABAJO-SEMESTRAL.md`: objetivos, Fase 1.1 (ambas opciones), Fase 1.2
    (generadores de carga), Fase 2 (indicadores de servidor y de experiencia de usuario),
    entregables y las recomendaciones del profesor sobre el uso del agente generativo.
  - Revisado el repositorio `jabtools/tiempo`: se identificó como el **ejemplo de referencia
    del profesor** del flujo de trabajo con agente (no como un error del usuario). Se extrajo
    y documentó el molde de su `AGENTS.md` y el formato de su `logs/prompts.md`.
  - `NOTAS.md`: agregada la sección 4-bis con el contenido de Modelos de Carga en la Web —
    CBMG, interacción Browser/WebServer sobre TCP-IP/HTTP/HTML, estructuras `HTTPRequest` y
    `HTTPResponse`, datos obtenibles, mecanismos de recolección y usos.
- **Defectos conocidos:** las láminas 9 a 15 de `Modelos de Carga en la Web.pdf` son imágenes
  sin texto extraíble, presumiblemente el diagrama del CBMG con sus probabilidades de
  transición. Quedan pendientes de revisión manual.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "Opción 1: e-commerce". Decisiones complementarias tomadas por el usuario:
  stack **Next.js + PostgreSQL**, herramienta de carga **k6**, y rubro del comercio delegado
  al agente para su propuesta.
- **Cambios:**
  - Propuesto el rubro: **Cumbre Café**, tostaduría de café de especialidad. Justificación:
    los atributos ortogonales del café (origen, variedad, proceso, nivel de tueste, notas de
    cata, formato, tamaño) producen filtros ricos para el catálogo y permiten que el detalle
    de producto sea una página naturalmente pesada frente a un home liviano, cumpliendo el
    requisito de "páginas con distinta carga de datos".
  - Creada la estructura del repositorio en `proyecto/`: `logs/`, `docs/`, `carga/escenarios/`.
  - Creado `AGENTS.md` con las reglas del agente, reglas específicas de desempeño,
    verificación obligatoria, cierre de entrega, áreas de expertise y convenciones técnicas.
  - Creado este `logs/prompts.md` con el historial retroactivo de la sesión.
  - Creados `README.md`, `.gitignore` y `docs/decisiones.md` (decisiones D-01 a D-05).
  - Inicializado el repositorio Git. Primer commit: `5bf5079`.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "Otro rubro". El usuario rechaza la propuesta de tostaduría de café. Ante cuatro
  alternativas ofrecidas (tecnología, librería, indumentaria/zapatillas, vinos), elige
  **indumentaria / zapatillas**.
- **Cambios:**
  - Rubro definitivo: **Pisada**, tienda de zapatillas e indumentaria urbana, con variantes de
    **talla y color** y stock por variante.
  - `AGENTS.md`: actualizado el nombre y el alcance funcional. Agregado el modelo de variantes
    y una regla de medición nueva sobre la **contención de stock bajo concurrencia**.
  - `docs/decisiones.md`: reescrita la decisión **D-02** con la justificación del nuevo rubro y
    dejando registrada la propuesta anterior descartada. Agregados dos pendientes: cantidad de
    variantes del catálogo semilla y estrategia de bloqueo para el descuento de stock
    (pesimista con `SELECT ... FOR UPDATE` frente a optimista con actualización condicional),
    que conviene medir y comparar.
  - `README.md`: actualizado el nombre y la descripción.
- **Propuestas no aprobadas:** rubro tostaduría de café de especialidad ("Cumbre Café"),
  descartado por el equipo.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "Sí, dale" — aprobación para iniciar la aplicación Next.js y el modelo de datos.
- **Cambios:**
  - Creado el proyecto Next.js 15.5.4 en `web/` (TypeScript, App Router, Tailwind v4).
    Dependencias agregadas, todas justificadas: `pg` (acceso a PostgreSQL),
    `@types/pg` y `prom-client` (métricas en formato Prometheus).
  - `web/db/esquema.sql`: modelo de datos con `marca`, `categoria`, `talla`, `color`,
    `producto`, `variante`, `usuario`, `carrito`, `carrito_item`, `pedido` y `pedido_item`.
    El inventario vive en `variante.stock`, a nivel de SKU. Se agregó `variante.version`
    para habilitar la comparación entre bloqueo optimista y pesimista. Los índices son
    deliberadamente mínimos y se documentó la omisión del índice de texto sobre
    `producto.nombre`, para medir primero el costo del `ILIKE`.
  - `web/db/semilla.mjs`: generador de catálogo con **semilla fija**, de modo que el
    conjunto de datos sea reproducible entre corridas y entre equipos. Por defecto 240
    productos; un 12 % de las variantes nace sin stock para generar abandono medible.
    Las marcas son ficticias.
  - `web/src/lib/metricas.ts`: registro Prometheus con métricas de proceso (CPU, memoria,
    event loop), duración de peticiones y de consultas en histogramas separados, estado del
    pool, compras rechazadas por stock, y el histograma `espera_bloqueo_stock_segundos`.
  - `web/src/lib/db.ts`: pool de PostgreSQL con tamaño configurable por `PG_POOL_MAX`,
    helper `consultar()` instrumentado y `enTransaccion()` para el checkout.
  - `web/src/lib/catalogo.ts`: consultas del catálogo en SQL directo, sin ORM.
  - `web/src/lib/instrumentar.ts` y `web/src/lib/formato.ts`.
  - `web/src/app/`: home (liviana), catálogo con filtros facetados y paginación (pesada),
    detalle de producto con matriz de tallas (intermedia), y `/api/metricas`.
  - `docker-compose.yml` con PostgreSQL 16 y límites explícitos de 1 CPU y 512 MB.
  - `web/.env.example`, scripts `semilla` y `typecheck` en `package.json`.
  - `AGENTS.md`: corregida la estructura, la aplicación vive en `web/` y no en `app/`.
  - **Verificación:** `npx tsc --noEmit` sin errores y `npm run build` exitoso. Las tres
    rutas quedaron marcadas como dinámicas, que es lo buscado.
- **Defectos conocidos:** la aplicación **no se ha ejecutado contra una base de datos real**.
  El equipo no tiene Docker ni PostgreSQL instalados, de modo que el esquema no ha sido
  aplicado, la semilla no se ha corrido y ninguna página se ha visto renderizada con datos.
  Queda pendiente levantar la base antes de poder dar por verificada la Fase 1.1.
- **Pendiente:** carrito, checkout con descuento de stock, autenticación, integración de GA4
  y los escenarios de k6.

## 2026-10-30 | agente: Claude Code (claude-opus-5)
- **Prompt:** "Instalo Docker" — el equipo opta por levantar PostgreSQL con Docker Compose en
  lugar de usar una base administrada en la nube.
- **Cambios:**
  - `web/src/lib/carrito.ts`: carrito identificado por token en cookie, con `ON CONFLICT`
    para resistir peticiones concurrentes del mismo usuario. Opera sobre variantes, no sobre
    productos.
  - `web/src/lib/checkout.ts`: **núcleo del trabajo.** Dos estrategias de control de
    concurrencia para el descuento de stock, ambas instrumentadas:
    - *pesimista*, con `SELECT ... FOR UPDATE`, que mide la espera real en el gestor de
      bloqueos de PostgreSQL;
    - *optimista*, con actualización condicional `WHERE stock >= cantidad` y reintentos,
      que mide el trabajo desperdiciado en vez de la espera.
    Se eligen por variable de entorno o por parámetro de consulta, para poder correr los
    mismos escenarios de k6 contra ambas. Los items se ordenan por `variante_id` antes de
    tomar bloqueos, para evitar interbloqueos.
  - `web/src/app/api/carrito/route.ts` y `web/src/app/api/checkout/route.ts`: endpoints REST
    con códigos de respuesta que distinguen compra exitosa (200), stock insuficiente (409) y
    conflicto por contención (503).
  - `web/src/app/carrito/page.tsx`, `web/src/components/boton-pagar.tsx` y
    `web/src/components/selector-variante.tsx`.
  - `web/src/components/analytics.tsx` y `web/src/lib/ga.ts`: GA4 con el embudo completo
    `view_item → add_to_cart → begin_checkout → purchase`, más un evento propio
    `compra_sin_stock` que explica el punto de fuga bajo carga. No se carga si falta
    `NEXT_PUBLIC_GA_ID`, para no contaminar la propiedad con tráfico de pruebas.
  - `docs/decisiones.md`: agregadas las decisiones **D-06** (REST en vez de Server Actions,
    para que k6 pueda ejecutar el embudo), **D-07** (el stock se descuenta al pagar, no al
    agregar al carrito) y **D-08** (orden global de bloqueo).
  - **Verificación:** `tsc --noEmit` y `npm run build` sin errores. Se corrigió un error de
    tipos detectado en la verificación: las dos estrategias devolvían formas distintas y se
    unificaron en el tipo `ResultadoDescuento`.
- **Defectos conocidos:** sigue sin ejecutarse contra una base de datos real. Nada de lo
  anterior —carrito, checkout, contención, eventos de GA4— ha sido probado en funcionamiento.
  La verificación hasta aquí es solo de compilación.
- **Pendiente:** levantar PostgreSQL y correr la semilla, recorrer el embudo completo en el
  navegador, autenticación de usuarios, escenarios de k6 y despliegue.

## 2026-10-31 | agente: Claude Code (claude-opus-5)
- **Prompt:** "ya quedo instalado docker, continuemos con lo que SIGUE, pero tambien
  explicame en detalle que es docker de forma facil, como se puede utilizar en el ambito, y
  como nos servira en el proyecto."
- **Cambios:**
  - Diagnóstico: Docker Desktop quedó instalado y su CLI responde (v29.9.2), pero el motor
    no arranca. Causa raíz confirmada con `Win32_Processor`: `VMMonitorModeExtensions=True`
    (la CPU i7-9700F soporta VT-x) pero `VirtualizationFirmwareEnabled=False`, es decir, la
    virtualización está **desactivada en la BIOS/UEFI**. Requiere intervención del usuario.
  - `carga/escenarios/comun.js`: modelo **CBMG** con probabilidades de transición entre
    estados (home, catálogo, producto, carrito, checkout, salir), métricas propias de k6,
    pasos del embudo y think time. Los 409 y 503 se etiquetan `esperado: no` para quedar
    fuera de la tasa de error sin dejar de contabilizarse.
  - `carga/escenarios/baja.js`, `normal.js` y `pico.js`: los tres escenarios que exige el
    enunciado. El de pico usa escalones y sin umbrales de corte, para poder observar qué
    ocurre más allá del punto de saturación.
  - `carga/escenarios/contencion.js`: escenario adicional en que todos los usuarios
    virtuales compiten por la **misma variante**. Sin él, con un catálogo de cientos de
    productos la probabilidad de colisión es ínfima y la contención de stock quedaría
    invisible.
  - `web/src/components/selector-variante.tsx`: agregados los atributos `data-variante` y
    `data-sku` a los botones de talla, para que el generador descubra desde el HTML las
    variantes comprables, igual que haría una persona mirando la matriz de tallas.
  - `carga/README.md` con instalación de k6, orden de ejecución recomendado y qué observar.
  - **Verificación:** `npm run build` sin errores.
- **Defectos conocidos:** la aplicación sigue sin ejecutarse contra una base de datos y los
  escenarios de k6 **no se han corrido ni una vez**. Están escritos pero no validados: es
  probable que el extractor de variantes o alguna probabilidad del CBMG necesiten ajuste
  tras la primera corrida real.
- **Pendiente:** habilitar VT-x en la BIOS, levantar PostgreSQL, correr la semilla, recorrer
  el embudo, validar los escenarios, autenticación y despliegue.

## 2026-11-03 | agente: Claude Code (claude-opus-5)
- **Prompt:** "ya active lo de la bios" — tras habilitar Intel VT-x en la BIOS de la placa
  ASUS PRIME H310M-E R2.0.
- **Cambios:**
  - Verificado `HypervisorPresent: True`. Docker Desktop arrancó: motor 29.9.2, 8 CPUs.
  - **PostgreSQL levantado** con `docker compose up -d`. Confirmado que los límites se
    aplicaron: `NanoCpus: 1000000000` (1 CPU) y `Memory: 536870912` (512 MB).
  - **Esquema aplicado y semilla ejecutada:** 240 productos, 4552 variantes, 539 sin stock
    (11,8 %), 80.989 unidades.
  - **Embudo verificado de extremo a extremo**: home, catálogo, catálogo con filtros,
    detalle de producto, agregar al carrito y checkout. Primera compra real registrada
    (pedido 1). Verificación visual en el navegador del catálogo con filtros y de la matriz
    de tallas con las combinaciones agotadas deshabilitadas.
  - **Prueba de contención ejecutada:** 60 compras simultáneas sobre una variante con 50
    unidades, en ambas estrategias. Resultado idéntico y correcto: 50 compras exitosas, 10
    rechazos con `409`, stock final 0, **cero variantes con stock negativo en toda la base**
    y ningún interbloqueo.
  - Creado `docs/hallazgos.md` con el experimento **E-01**: línea base de tiempos, resultados
    de ambas estrategias y el hallazgo inesperado.
- **Hallazgo:** la estrategia optimista **no reintentó ni una vez**. Causa: en PostgreSQL
  bajo `READ COMMITTED`, un `UPDATE` sobre una fila bloqueada no falla, sino que **espera** y
  luego reevalúa la condición. Es decir, la implementación "optimista" también hace cola
  sobre la misma fila, lo que explica que ambas estrategias midan prácticamente lo mismo
  (25 ms frente a 23 ms). Contradice la hipótesis documentada en `checkout.ts`, y queda
  registrado como tal.
- **Defectos conocidos:** los escenarios de k6 siguen sin ejecutarse. La prueba de contención
  se hizo con `curl` en paralelo, suficiente para demostrar correctitud pero no para
  caracterizar la degradación ni obtener la curva de saturación.
- **Pendiente:** correr los escenarios de k6, repetir la prueba optimista con aislamiento
  `REPEATABLE READ` para que la comparación tenga sentido, autenticación, GA4 con propiedad
  real y despliegue.

## 2026-11-03 | agente: Claude Code (claude-opus-5)
- **Prompt:** "mira en canvas el profesor a subido este material, si necesitas alguno hazmelo
  saber", seguido del envío de Cátedra 1.2 Teoría de Colas, Cátedra 1.1 Análisis Operacional,
  Texto Apoyo Ley de Little, documento de QoS de CPU y tres sets de ejercicios.
- **Cambios:**
  - Material copiado a `material/catedras/`, `material/apoyo/` y `material/ejercicios/`.
  - `NOTAS.md`: nueva sección 8 con las fórmulas de teoría de colas (Kendall, M/M/1, M/M/s,
    M/M/1/k, Little) y las variables y leyes del análisis operacional.
  - **`proyecto/docs/marco-teorico.md`**: documento nuevo que traduce el formalismo del ramo
    a las métricas que el sistema emite. Descompone Pisada en cinco estaciones de servicio
    siguiendo el modelo del servidor central, mapea cada variable operacional a su fuente de
    medición, y plantea cómo aplicar las cuatro leyes y el modelo M/M/1 al bloqueo de stock.
  - Autenticación completada en la sesión anterior: `auth.ts`, `/api/auth`, `/cuenta`,
    `formulario-cuenta.tsx` y tabla `sesion` en el esquema. Typecheck limpio.
- **Conexión conceptual registrada:** las probabilidades de transición del CBMG **son** las
  razones de visita `Vᵢ` de la ley del flujo forzado. El modelo de carga del material de
  "Modelos de Carga en la Web" y las leyes operacionales de la Unidad 2 describen el mismo
  modelo desde dos ángulos. Eso explica cuantitativamente por qué los escenarios de
  navegación aleatoria no saturan el stock: `V_checkout` es pequeña por diseño del CBMG.
- **Resultados de k6, carga sostenida normal (25 VU, 10 min):** p95 = 36,12 ms,
  p99 = 45,9 ms, 3038 peticiones, throughput 4,88 req/s, **0 % de error**, 852 iteraciones y
  52 compras. Prácticamente idéntico a la línea base de 5 VU (p95 = 37,65 ms): a 25 usuarios
  el sistema **todavía no muestra degradación alguna**.
- **Defectos conocidos:** el escenario de pico seguía ejecutándose al cierre de esta entrada.
  La aplicación no se ha reconstruido tras agregar la autenticación, y la base en ejecución
  aún no tiene la tabla `sesion`.

## 2026-11-04 | agente: Claude Code (claude-opus-5)
- **Prompt:** (evento de tarea en segundo plano) Finalización del escenario de pico de k6.
- **Cambios:**
  - Analizados los resultados de los tres escenarios y construida la **curva de utilización
    por escalón**, cruzando el muestreo del servidor con el calendario de `pico.js`.
  - `carga/analizar-serie.py`: script que procesa la serie temporal de `/api/metricas`,
    calcula la utilización por escalón y aplica la ley de utilización y la ley de Amdahl.
  - `carga/resultados/metricas-serie-2026-11-03.txt`: serie temporal cruda, versionada.
  - `docs/hallazgos.md`: experimento **E-03** completo.
- **Resultados principales:**
  - Pico (hasta 350 VU): p(95) = 118,72 ms, p(99) = 199,01 ms, 31,48 req/s, 3 fallas sobre
    26.447 peticiones, conversión del embudo 99,61 %. **El sistema no colapsó.**
  - Utilización de CPU por escalón: 9,2 % (25 VU), 16,3 % (50), 28,2 % (100), 52,6 % (200),
    **76,1 % (350)**. Crecimiento casi lineal, pero la CPU *por usuario* decrece de
    0,368 %/VU a 0,217 %/VU: firma del encolamiento.
  - **Punto de saturación no alcanzado.** Extrapolación lineal: ~503 VU. Se deja constancia
    de que la extrapolación es optimista, porque cerca de `ρ = 1` la degradación se acelera.
  - **Primera cola sobre el pool:** 26 peticiones en espera con el pool en su máximo de 10,
    durante el escalón de 350 VU. El pool, y no la CPU, será probablemente el primer recurso
    en saturarse.
  - **Ley de utilización verificada sobre datos propios:** `U = X·S` con B = 298,1 s,
    T = 850 s, C = 26.447 → U = 35,1 %, X = 31,11 pet/s, S = **11,27 ms de CPU por petición**.
  - **Costo de consultas medido:** el `COUNT(*)` de la paginación cuesta 4,55 ms, un **54 %
    de lo que cuesta el listado completo** (8,49 ms), sin devolver una sola fila de datos.
    Candidato concreto de optimización.
  - **Ley de Amdahl aplicada:** fracción serializada del checkout = **7,2 %**, techo de
    aceleración = **13,9x**. Por mucha CPU que se agregue, el checkout no puede mejorar más
    que eso: reducir esa fracción exige rediseño, no hardware.
- **Defectos conocidos:** el resumen de k6 es agregado, de modo que **no hay throughput por
  escalón** y no se puede trazar la curva `X` frente a usuarios virtuales, que es donde se ve
  el aplanamiento de la saturación. Requiere repetir el pico con `--out json`.
- **Pendiente:** corrida con serie temporal, escalones hasta 600–800 VU, variar `PG_POOL_MAX`,
  correr `contencion.js` y recalcular Amdahl bajo contención alta, GA4 y despliegue.
