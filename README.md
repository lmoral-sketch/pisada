# Pisada

Tienda de comercio electrónico de zapatillas e indumentaria urbana, desarrollada como trabajo
semestral del ramo **INFB8091 — Desempeño de Sistemas** (UTEM, 2º semestre 2026).
Profesor: Javier Aranda.

> **Fin académico.** El comercio es el sujeto de estudio, no el objetivo. El propósito del
> proyecto es **evaluar el desempeño de un sitio web bajo distintas condiciones de carga**.
> Las marcas y productos son ficticios, el checkout es simulado y **no se procesan pagos
> reales**.

**Integrantes:** *(pendiente)*
**Sitio desplegado:** https://pisada.onrender.com
**Propiedad de GA4:** `G-P8EWE6D7G3`

---

## Por dónde empezar a revisar

| Documento | Qué contiene |
|---|---|
| **[`docs/informe-fase1.md`](docs/informe-fase1.md)** | **Informe técnico.** Arquitectura, metodología, resultados, cuellos de botella y conclusiones |
| [`docs/hallazgos.md`](docs/hallazgos.md) | Bitácora de los seis experimentos, con los datos crudos |
| [`docs/marco-teorico.md`](docs/marco-teorico.md) | Traducción del formalismo del ramo a las métricas del sistema |
| [`docs/decisiones.md`](docs/decisiones.md) | Las ocho decisiones de diseño y su justificación |
| [`docs/despliegue.md`](docs/despliegue.md) | Configuración de GA4, base de datos y despliegue |
| [`logs/prompts.md`](logs/prompts.md) | **Registro de prompts** exigido por el enunciado |
| [`carga/README.md`](carga/README.md) | Cómo ejecutar los generadores de carga |

---

## La idea central del trabajo

El inventario vive a nivel de **SKU** (producto + talla + color): 240 productos producen
**4552 variantes**, cada una con su propio stock.

Esa decisión es el eje del proyecto. El descuento de stock durante el checkout obliga a
**serializar el acceso a una fila de la base de datos**, y esa serialización produce una cola
de espera real, medible y analizable con teoría de colas (Unidad 3) y análisis operacional
(Unidad 2) sobre datos propios, en lugar de sobre un ejemplo de pizarrón.

El hallazgo principal fue inesperado: la contención sobre una sola fila **se propaga al pool
de conexiones**, que es un recurso compartido, y degrada todo el sitio — incluidas páginas que
no tienen relación con ese producto.

---

## Arquitectura

```
Navegador ──HTTP──> Next.js (App Router) ──pool pg──> PostgreSQL 16
                         │                                 │
                         ├── /api/carrito                  ├── producto (240)
                         ├── /api/checkout                 ├── variante (4552)
                         ├── /api/auth                     ├── carrito / pedido
                         └── /api/metricas ──> Prometheus  └── usuario / sesion
```

| Componente | Elección | Por qué |
|---|---|---|
| Acceso a datos | `pg` con SQL directo, **sin ORM** | El trabajo analiza el costo de las consultas; un ORM las esconde |
| Despliegue | Contenedor Docker, **no serverless** | Serverless no expone la utilización de recursos, que la Fase 2 exige medir |
| Generador de carga | k6 con modelo **CBMG** | Entrega percentiles de fábrica y los scripts se versionan |

---

## Estructura

```
proyecto/
├── AGENTS.md              Reglas de trabajo para agentes de IA
├── docker-compose.yml     PostgreSQL local con límites explícitos de recursos
├── render.yaml            Configuración del despliegue
├── docs/                  Informe y documentación de análisis
├── logs/prompts.md        Registro de prompts
├── carga/
│   ├── escenarios/        Scripts de k6 (baja, normal, pico, contención)
│   ├── resultados/        Reportes de las corridas
│   └── analizar-serie.py  Procesa la serie temporal de métricas
└── web/
    ├── db/
    │   ├── esquema.sql        Modelo de datos
    │   ├── semilla.mjs        Generador del catálogo (semilla fija, reproducible)
    │   └── medir-latencia.mjs Separa la red del trabajo real del servidor
    └── src/
        ├── lib/           Acceso a datos, métricas, autenticación
        ├── components/
        └── app/           Rutas y API
```

---

## Cómo ejecutarlo en local

**Requisitos:** Node.js 22+, Docker Desktop, y k6 para las pruebas de carga.

```bash
docker compose up -d
```

```bash
cd web && npm install && cp .env.example .env
```

```bash
npm run semilla
```

```bash
npm run build && npm run start
```

El sitio queda en `http://localhost:3000` y las métricas en `http://localhost:3000/api/metricas`.

### Variables de entorno

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Conexión a PostgreSQL |
| `PG_POOL_MAX` | Tamaño del pool. **Es un parámetro de capacidad**, no un detalle |
| `NEXT_PUBLIC_GA_ID` | Identificador de medición de GA4 |
| `ESTRATEGIA_STOCK` | `pesimista` u `optimista` |

---

## Pruebas de carga

```bash
k6 run carga/escenarios/baja.js
```

Los cuatro escenarios y el orden recomendado están en [`carga/README.md`](carga/README.md).

> **Importante:** el escenario `contencion.js` requiere indicar una variante con
> `-e VARIANTE_ID=<id>` y suficiente stock, o medirá rechazos en vez de contención.

---

## Instrumentación

Expuesta en `/api/metricas` en formato Prometheus:

| Métrica | Qué responde |
|---|---|
| `peticion_duracion_segundos` | Tiempo de respuesta por ruta |
| `consulta_duracion_segundos` | ¿La degradación viene de la aplicación o de la base? |
| `espera_bloqueo_stock_segundos` | Espera en cola sobre el SKU |
| `espera_conexion_segundos` | Espera por una conexión del pool |
| `pool_conexiones` | Estado del pool: total, ocioso, en espera |
| `process_cpu_seconds_total` | Utilización de CPU |

---

## Nota sobre el uso de agentes de IA

El enunciado exige desarrollar con un agente generativo y registrar cada prompt. Este
proyecto se desarrolló con **Claude Code**, y el registro completo está en
[`logs/prompts.md`](logs/prompts.md), con fecha, modelo, prompt y resumen de los cambios.

Las reglas de trabajo del agente están en [`AGENTS.md`](AGENTS.md) e incluyen, entre otras,
confirmación previa antes de modificar archivos, documentación en español, verificación
obligatoria antes de dar algo por terminado, y registro explícito de los **defectos conocidos
y las propuestas no aprobadas**.

Esa última regla explica por qué el informe incluye una sección de errores metodológicos
propios: cuatro de los hallazgos del trabajo fueron equivocaciones de método que se
detectaron y corrigieron durante el desarrollo, y están documentadas como parte del
resultado.
