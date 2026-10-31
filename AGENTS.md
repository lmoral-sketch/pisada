# AGENTS.md — Pisada

## Proyecto

**Pisada** es una tienda de comercio electrónico de zapatillas e indumentaria urbana,
construida como trabajo semestral del ramo **INFB8091 — Desempeño de Sistemas**
(UTEM, 2º semestre 2026, profesor Javier Aranda).

El objetivo académico **no es el comercio en sí**, sino disponer de un sitio real y medible
sobre el cual **generar carga sintética y evaluar su desempeño**. Toda decisión de diseño se
subordina a esa finalidad: si una opción hace el sitio más bonito pero menos medible, se
descarta.

### Alcance funcional (Fase 1.1 del enunciado)
- Catálogo de productos con **filtros y búsqueda** (categoría, marca, talla, color, género, precio).
- **Modelo de variantes:** cada producto tiene múltiples SKU por combinación de **talla y color**,
  con **stock propio por variante**.
- **Carrito de compras** persistente por sesión, que opera sobre variantes, no sobre productos.
- **Flujo de checkout simulado** con el sandbox de un medio de pago disponible en Chile.
  **Nunca** se integra una pasarela de pago real ni se procesan datos de tarjeta reales.
- **Registro e inicio de sesión** de usuario.
- Al menos tres páginas con **distinta carga de datos**, de forma deliberada:
  - `/` (home) — liviana: destacados y banner
  - `/catalogo` — pesada: listado paginado con filtros facetados y muchos ítems
  - `/producto/[slug]` — media: galería, matriz de tallas con disponibilidad, guía de calce, relacionados
- **Google Analytics 4** con eventos `view_item`, `add_to_cart`, `begin_checkout` y `purchase`,
  más métricas de engagement.

### Alcance de medición (Fases 1.2 y 2)
- **Generadores de carga** con k6, parametrizables (usuarios virtuales, ramp-up, duración, tasa).
- Tres escenarios obligatorios: **carga baja**, **carga sostenida normal** y **carga pico/estrés**.
- Instrumentación del servidor para medir **CPU, memoria e I/O** durante las pruebas.
- Métricas de respuesta reportadas siempre con **mediana y percentiles p90, p95 y p99**,
  nunca solo con el promedio.
- **Contención de stock bajo concurrencia.** El descuento de inventario por variante es un punto
  de serialización real: varios usuarios virtuales comprando el mismo SKU compiten por la misma
  fila. Se mide el tiempo de espera en ese bloqueo, porque es el cuello de botella que mejor se
  explica con teoría de colas y análisis operacional.

### Stack
- **Next.js** (App Router) + **PostgreSQL**.
- Empaquetado en **Docker**, desplegado en un proveedor cloud gratuito que entregue acceso
  a métricas del contenedor. *Razón:* un despliegue serverless impediría medir utilización
  de CPU, memoria e I/O, que es un requisito explícito de la Fase 2.
- Generadores de carga en **k6** (JavaScript), versionados junto al resto del código.

---

## Reglas para agentes

1. **Confirmación previa.** Antes de crear, modificar o eliminar cualquier archivo, explicar
   qué va a cambiar y en qué módulos o archivos fuente. Aplicar **solo** tras confirmación
   explícita del usuario.
2. **Log de prompts.** Registrar en `logs/prompts.md` **cada** prompt del usuario, completo,
   con fecha, hora y el **modelo** utilizado, más un resumen de lo que ese prompt generó.
   Formato fijo:
   ```
   ## YYYY-MM-DD HH:mm | agente: <nombre> (<modelo>)
   - **Prompt:** <texto solicitado por el usuario>
   - **Cambios:** <resumen de archivos creados/modificados>
   ```
   Cuando queden defectos sin corregir o propuestas que el usuario no aprobó, se registran
   como `- **Defectos conocidos:**` y `- **Propuestas no aprobadas:**`. La trazabilidad de
   lo que **no** se hizo es parte del informe.
3. **Lectura del log al iniciar sesión.** Al comenzar una sesión nueva, leer `logs/prompts.md`
   antes de actuar, para recuperar el contexto y la historia de decisiones.
4. **Control de versiones.** Git local sincronizado con GitHub. Commits periódicos y con
   mensaje descriptivo en español. Nunca acumular varios cambios sin relación en un commit.
5. **Idioma.** Todo —código, comentarios, documentación, interfaz y mensajes de commit— en
   **español neutro latinoamericano**. Sin chilenismos ni modismos regionales en la interfaz.
6. **Documentación del código.** Todo módulo, función y componente lleva comentarios que
   expliquen propósito, parámetros y retorno.
7. **Sin dependencias nuevas sin confirmación.** Cada librería agregada se justifica. Las
   dependencias afectan el tamaño del bundle y los tiempos de respuesta, que son precisamente
   lo que este proyecto mide.
8. **Secretos.** Credenciales, cadenas de conexión, ID de medición de GA4 y claves del sandbox
   de pago van en `.env` (ignorado por Git). Nunca en el código, nunca en el log de prompts,
   nunca en una captura de pantalla del informe.
9. **Datos de pago.** El checkout usa exclusivamente el **sandbox** del medio de pago y sus
   tarjetas de prueba publicadas. Jamás se ingresan ni almacenan datos de tarjetas reales.

---

## Reglas específicas de desempeño

10. **Todo cambio que afecte el camino de una petición se mide.** Si se agrega una consulta a
    la base de datos, un middleware o una llamada externa, se deja constancia de su costo.
11. **Las páginas conservan su perfil de carga.** El home es liviano, el catálogo es pesado y
    el detalle es intermedio **a propósito**. No "optimizar" esa diferencia sin autorización:
    es el material experimental del trabajo.
12. **Instrumentación siempre activa.** El servidor expone métricas de utilización de recursos
    y registra el tiempo de respuesta de cada petición. Esa instrumentación no se desactiva
    "para mejorar el rendimiento".
13. **Reportes de carga versionados.** Los resultados de k6 se guardan en `carga/resultados/`
    con el nombre del escenario y la fecha, para poder comparar corridas entre sí.
14. **Nunca cargar contra el sitio de terceros.** Los generadores apuntan solo a nuestro propio
    despliegue o al entorno local. Generar tráfico contra infraestructura ajena no está
    autorizado bajo ninguna circunstancia.

---

## Verificación obligatoria

15. **Antes de presentar cualquier entrega como terminada:**
    - El proyecto **compila** sin errores (`npm run build`).
    - El sitio levanta y responde en local.
    - Se recorren los flujos mínimos: home → catálogo → filtro → detalle → agregar al carrito
      → checkout → confirmación.
    - La consola del navegador no muestra errores.
    - Los eventos de GA4 se disparan y se verifican en el **DebugView** de GA4.
16. **Pruebas automáticas.** Cada pieza nueva se acompaña de una prueba. Las pruebas de los
    generadores de carga se validan primero con una corrida corta (pocos usuarios virtuales,
    duración breve) antes de lanzar un escenario completo.
17. **Si algo falla, la entrega no se presenta como terminada.** Se corrige y se repite la
    verificación completa. No se reporta como hecho lo que no se verificó.

---

## Cierre de entrega

18. **Commit.** Si la verificación pasa, se consulta al usuario si hace commit, con un mensaje
    en español que describa los cambios. Si algo falló, no se hace commit.
19. **Deploy.** Al terminar una modificación se pregunta al usuario, por separado, si desea
    desplegar. El deploy nunca es automático.
20. **Informe del hash.** Tras cada commit se informa el hash resultante.

---

## En qué debe ser experto el agente

- **Ingeniería de desempeño:** percentiles frente a promedios, throughput, punto de saturación,
  leyes de Amdahl y Gustafson, análisis operacional y teoría de colas aplicada a sistemas web.
- **Modelos de carga:** *Customer Behavior Model Graph* (CBMG) y ajuste de probabilidades de
  transición a partir de datos reales de navegación.
- **k6:** escenarios, etapas de ramp-up, umbrales (*thresholds*), métricas personalizadas y
  exportación de reportes.
- **Next.js y PostgreSQL:** renderizado, caché, consultas y sus implicancias en latencia.
- **GA4:** medición mejorada de comercio electrónico, eventos personalizados y Core Web Vitals.
- **Docker y despliegue en nube:** límites de recursos y recolección de métricas del contenedor.

---

## Convenciones técnicas

- Código de la aplicación en `web/`; generadores de carga en `carga/`; documentación en `docs/`.
- Nombres de archivos en minúsculas con guiones.
- Las consultas a la base de datos se concentran en una capa propia, nunca dispersas en los
  componentes de interfaz.
- Zona horaria del proyecto: `America/Santiago`. Moneda: peso chileno (CLP), sin decimales.

## Estructura

```
pisada/
├── AGENTS.md              Este archivo
├── README.md
├── .gitignore
├── logs/
│   └── prompts.md         Log obligatorio de prompts
├── docs/
│   ├── decisiones.md      Decisiones de diseño y su justificación
│   └── arquitectura.md    Arquitectura del sistema (va en el informe)
├── docker-compose.yml     PostgreSQL local con límites de recursos explícitos
├── web/                   Aplicación Next.js
│   ├── db/
│   │   ├── esquema.sql    Modelo de datos
│   │   └── semilla.mjs    Generador del catálogo (reproducible, semilla fija)
│   └── src/
│       ├── lib/           Acceso a datos, métricas e instrumentación
│       ├── components/
│       └── app/           Rutas
└── carga/
    ├── escenarios/        Scripts k6 (baja, normal, pico)
    └── resultados/        Reportes de las corridas (ignorado parcialmente por Git)
```

---

## Contexto académico

- **Entregables:** Fase 1 y Fase 2, cada una con **informe técnico** y **presentación
  pregrabada en video** con participación de todos los integrantes.
- **Acceso del profesor:** la propiedad de GA4 debe compartirse con `j.aranda@utem.cl`.
- **Identidad visual:** se aplica el Manual de Identidad Visual de UTEM en informes y
  presentaciones.
- El enunciado completo y su resumen están en `../enunciado/`.
