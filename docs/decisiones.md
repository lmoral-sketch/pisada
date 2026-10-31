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

## D-02 — Rubro: zapatillas e indumentaria urbana

**Decisión.** El comercio es **Pisada**, tienda de zapatillas e indumentaria urbana, con
**variantes de talla y color** y stock por variante.

> *Propuesta previa descartada:* una tostaduría de café de especialidad. Se cambió por decisión
> del equipo. La justificación de aquella opción era la riqueza de atributos para filtros; el
> rubro elegido la conserva y además agrega el modelo de variantes, que es más exigente.

**Justificación.** Tres razones, en orden de importancia para el trabajo:

1. **Contención real sobre el stock.** Es la ventaja decisiva. Cada SKU (producto + talla +
   color) tiene su propio inventario, y el descuento de stock en el checkout obliga a
   **serializar el acceso a esa fila**. Cuando varios usuarios virtuales compran la misma
   combinación de forma concurrente, aparece un **punto de serialización genuino** con espera
   en cola. Eso permite:
   - analizar el sistema con **teoría de colas** y **análisis operacional** (Unidades 2 y 3 del
     ramo) sobre un recurso real, no sobre un ejemplo de pizarrón;
   - aplicar la **ley de Amdahl** con sentido: la fracción serializable del checkout acota la
     mejora alcanzable por más CPU, y eso se puede **demostrar con mediciones propias**.

   Un catálogo sin variantes no produce este fenómeno: las lecturas escalan bien y el único
   cuello de botella observable sería CPU o ancho de banda.

2. **Embudo de conversión más exigente.** La selección de talla es un paso adicional entre ver
   el producto y agregarlo al carrito, y una fuente natural de abandono (talla sin stock). El
   embudo `view_item → add_to_cart → begin_checkout → purchase` que pide la Fase 2 queda más
   rico y con un punto de fuga que se puede medir en GA4.

3. **Distinta carga de datos entre páginas**, que es requisito explícito del enunciado:
   - **home liviano**: destacados y banner;
   - **catálogo pesado**: listado paginado con filtros facetados por categoría, marca, talla,
     color, género y precio — las facetas obligan a agregaciones sobre las variantes;
   - **detalle intermedio**: galería, matriz de tallas con disponibilidad, guía de calce y
     productos relacionados.

Esa diferencia de peso entre páginas es **material experimental**, no un defecto: permite
observar cómo se degradan de manera distinta bajo la misma carga.

**Consecuencia para los generadores de carga.** El escenario de pico debe incluir, de forma
deliberada, un perfil de usuarios que compitan por **el mismo SKU popular** (simulando un
lanzamiento o una liquidación). Sin ese perfil, la contención de stock no se manifiesta y se
pierde el hallazgo más interesante del trabajo.

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

## D-06 — API REST en lugar de Server Actions

**Decisión.** El carrito y el checkout se exponen como endpoints REST
(`/api/carrito`, `/api/checkout`), no como Server Actions de Next.js.

**Justificación.** Las Server Actions se invocan con un identificador cifrado que cambia en
cada compilación y requieren cabeceras internas del framework. k6 no puede ejecutarlas de
forma estable ni legible. Con endpoints REST, el generador de carga recorre exactamente el
mismo embudo que un cliente real, y los scripts siguen siendo válidos aunque se recompile la
aplicación.

**Consecuencia adicional.** Los códigos de respuesta se eligieron para que el generador
distinga los desenlaces sin leer el cuerpo:

| Código | Significado |
|---|---|
| `200` | Compra exitosa |
| `409` | Stock insuficiente — **resultado de negocio legítimo, no un error** |
| `503` | Conflicto por contención extrema: se agotaron los reintentos |

La distinción entre `409` y error real es importante para el informe: contar los `409` dentro
de la tasa de error llevaría a concluir que el sistema falla cuando en realidad está agotando
inventario, que es el comportamiento esperado.

---

## D-07 — El stock se descuenta al pagar, no al agregar al carrito

**Decisión.** Agregar un producto al carrito **no** reserva inventario. El descuento ocurre
únicamente dentro de la transacción de checkout.

**Justificación.** Reservar al agregar al carrito desplazaría la contención fuera del
checkout y repartiría la espera entre dos puntos distintos, diluyendo el fenómeno que el
trabajo quiere medir. Además, es como opera la mayoría del comercio electrónico real.

**Consecuencia.** El carrito puede contener items cuyo stock se agotó mientras el usuario
decidía. Eso no es un defecto: es la fuente del rechazo `409` y el punto de fuga del embudo
que se analiza en la Fase 2.

---

## D-08 — Orden global de bloqueo para evitar interbloqueos

**Decisión.** Antes de descontar stock, los items del carrito se ordenan por `variante_id`.

**Justificación.** Si dos transacciones concurrentes bloquearan las mismas dos filas en orden
distinto —una A→B y la otra B→A— se produciría un **interbloqueo** y PostgreSQL abortaría una
de ellas. Tomar siempre los bloqueos en el mismo orden global elimina esa posibilidad por
construcción, sin costo adicional.

Es un detalle fácil de pasar por alto que solo se manifiesta bajo concurrencia, es decir,
justo durante las pruebas de carga y no durante el desarrollo.

---

## Pendientes de decisión

- [ ] Proveedor de despliegue concreto y sus límites de recursos
- [ ] Medio de pago en sandbox (Transbank Webpay Plus tiene ambiente de integración público)
- [ ] Mecanismo de instrumentación de recursos del servidor
- [ ] Tamaño del catálogo semilla y cantidad de variantes por producto (inciden en el peso del
      listado y en la intensidad de la contención)
- [ ] Estrategia de bloqueo para el descuento de stock (`SELECT ... FOR UPDATE` frente a
      actualización condicional optimista) — conviene **medir ambas** y comparar
- [ ] Probabilidades de transición del CBMG para los perfiles de usuario sintético
