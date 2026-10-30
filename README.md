# Pisada

Tienda de comercio electrónico de zapatillas e indumentaria urbana, desarrollada como trabajo
semestral del ramo **INFB8091 — Desempeño de Sistemas** (UTEM, 2º semestre 2026).

> **Fin académico.** El comercio es el sujeto de estudio, no el objetivo: el propósito del
> proyecto es **evaluar el desempeño de un sitio web bajo distintas condiciones de carga**.
> El checkout es simulado y no procesa pagos reales.

Los productos tienen **variantes de talla y color con stock propio**. Esa decisión no es
cosmética: el descuento de inventario por variante crea un **punto de serialización** que, bajo
usuarios concurrentes compitiendo por el mismo SKU, produce espera en cola medible. Es el
fenómeno central que el trabajo analiza.

## Qué hay acá

| Carpeta | Contenido |
|---|---|
| `app/` | Aplicación Next.js (catálogo, carrito, checkout, autenticación) |
| `carga/escenarios/` | Scripts de k6: carga baja, sostenida y pico/estrés |
| `carga/resultados/` | Reportes de las corridas de carga |
| `docs/` | Decisiones de diseño y arquitectura del sistema |
| `logs/prompts.md` | Registro de prompts exigido por el enunciado |
| `AGENTS.md` | Reglas de trabajo para agentes de IA |

## Stack

- **Next.js** (App Router) + **PostgreSQL**
- Empaquetado en **Docker**, desplegado en un proveedor cloud con plan gratuito que permita
  medir utilización de CPU, memoria e I/O del contenedor
- **k6** para los generadores de carga
- **Google Analytics 4** para los indicadores de experiencia de usuario

> La elección del despliegue no es cosmética: un entorno serverless impediría medir la
> utilización de recursos del servidor, que es un requisito explícito de la Fase 2.

## Cómo ejecutarlo

*(Pendiente — se completa al implementar la aplicación.)*

## Pruebas de carga

*(Pendiente — se completa al implementar los generadores.)*

## Documentación relacionada

- Enunciado y su resumen: `../enunciado/`
- Apuntes del ramo: `../NOTAS.md`
- Reglas del agente: `AGENTS.md`
- Historial de prompts: `logs/prompts.md`
