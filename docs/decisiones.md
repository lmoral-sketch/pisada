# Decisiones de diseño

Registro de las decisiones tomadas y su justificación. Este documento alimenta directamente
la sección de arquitectura y metodología del informe técnico.

---

## D-01 — Opción 1: comercio electrónico

**Decisión.** Se desarrolla un sitio de comercio electrónico (Opción 1 del enunciado) en lugar
de un sitio de servicios sobre API externa (Opción 2).

**Justificación.** La Fase 2 exige medir la **tasa de conversión del embudo**
(vitrina → carrito → compra → pago), y los eventos de GA4 que el enunciado nombra
explícitamente —`add_to_cart`, `begin_checkout`, `purchase`, `view_item`— son eventos de
comercio electrónico. Con la Opción 2 habría que construir un embudo análogo y argumentar su
equivalencia. Además, el material de cátedra sobre **CBMG** modela flujos de navegación
comercial con probabilidades de transición, de modo que el marco teórico del ramo calza
directamente con el objeto de estudio.

---

## D-02 — Rubro: tostaduría de café de especialidad

**Decisión.** El comercio es **Cumbre Café**, una tostaduría de café de especialidad.

**Justificación.** El requisito de "al menos 2-3 páginas con distinta carga de datos" se cumple
mejor con un dominio cuyos productos tengan **muchos atributos ortogonales**: origen, variedad,
proceso, nivel de tueste, notas de cata, formato de molienda y tamaño. Eso produce:

- un **catálogo pesado**, con filtros múltiples y paginación real;
- un **detalle de producto de peso medio**, con ficha de cata, perfil de tueste, datos del
  productor y productos relacionados;
- un **home liviano**, con destacados.

Esa diferencia de peso entre páginas es **material experimental**, no un defecto: permite
observar cómo se degradan de manera distinta bajo la misma carga.

---

## D-03 — Stack: Next.js + PostgreSQL

**Decisión.** Next.js (App Router) sobre PostgreSQL.

**Justificación.** Next.js permite construir rápido las vistas y la API en un solo proyecto, y
PostgreSQL da consultas con filtros y paginación realistas, que son las que efectivamente se
degradan bajo carga. Un catálogo servido desde un archivo estático no produciría contención
observable en la base de datos.

---

## D-04 — Despliegue en contenedor, no serverless

**Decisión.** La aplicación se empaqueta en **Docker** y se despliega en un proveedor que
entregue un contenedor o máquina con métricas de recursos accesibles.

**Justificación.** Esta es la decisión más importante del proyecto y la que más condiciona el
resultado. La Fase 2 exige medir **utilización de CPU, memoria e I/O del servidor durante las
pruebas** y determinar el **punto de saturación**. Un despliegue serverless (Vercel, Netlify
Functions) escala horizontalmente de forma transparente y **no expone esas métricas**: el sitio
simplemente no se saturaría de forma observable, y la Fase 2 quedaría sin su evidencia central.

> El propio enunciado advierte que "la elección del stack podría influir en la segunda fase".

**Consecuencia.** Se prefiere un plan gratuito con recursos **limitados y conocidos** (por
ejemplo, 0,5 vCPU y 512 MB) antes que uno elástico. Un límite bajo es una **ventaja** acá: hace
que el punto de saturación aparezca dentro del rango de carga que podemos generar.

---

## D-05 — Generadores de carga con k6

**Decisión.** Los generadores se construyen con **k6**.

**Justificación.** k6 entrega de fábrica los **percentiles p90, p95 y p99** que el enunciado
exige, exporta reportes en HTML y JSON para adjuntar como entregable, y sus scripts son código
JavaScript versionable en Git junto al resto del proyecto. JMeter, en cambio, guarda sus planes
en XML difíciles de revisar en un diff, y su ejecución por GUI es menos reproducible.

---

## Pendientes de decisión

- [ ] Proveedor de despliegue concreto y sus límites de recursos
- [ ] Medio de pago en sandbox (Transbank Webpay Plus tiene ambiente de integración público)
- [ ] Mecanismo de instrumentación de recursos del servidor
- [ ] Tamaño del catálogo semilla (incide en el peso del listado)
- [ ] Probabilidades de transición del CBMG para los perfiles de usuario sintético
