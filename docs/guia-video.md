# Guía para grabar el video

Para quien se encargue del video sin haber participado en el desarrollo. Incluye cómo
levantar el proyecto, qué mostrar y un guion con lo que hay que decir en cada parte.

**Sitio en vivo:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada

> ⚠️ El sitio se **suspende tras 15 minutos sin uso** y tarda hasta 50 segundos en despertar.
> **Ábrelo 5 minutos antes de grabar** y deja la pestaña cargada.

---

## Parte 1 — Levantar el proyecto (opcional)

Para grabar basta con el sitio en vivo. Esto es solo si quieres mostrar el código corriendo
en tu equipo.

**Necesitas:** Node.js 22+, Docker Desktop y Git.

```
git clone https://github.com/lmoral-sketch/pisada.git
```

```
cd pisada && docker compose up -d
```

```
cd web && npm install && cp .env.example .env
```

```
npm run semilla
```

```
npm run build && npm run start
```

Queda en `http://localhost:3000`.

> Si Docker no arranca, revisa que la virtualización esté activada en la BIOS. Es el problema
> más común en Windows.

---

## Parte 2 — Qué es este trabajo, en dos minutos

Para poder hablar con propiedad aunque no lo hayas desarrollado.

**Pisada** es una tienda de zapatillas. Pero la tienda **no es el objetivo**: es el *sujeto de
estudio*. Lo que el trabajo hace es **medir cómo se degrada un sitio web cuando se le aplica
carga**.

### La idea central

Cada producto tiene variantes de **talla y color**, y cada combinación tiene **su propio
stock**. Son 240 productos que dan **4552 variantes**.

Eso importa porque, cuando alguien compra, hay que descontar stock de **una fila concreta** de
la base de datos. Si veinte personas compran la misma talla del mismo modelo al mismo tiempo,
**tienen que hacer fila** — la base de datos las atiende de a una.

Esa fila es una **cola de espera real**, medible, y es lo que permite aplicar la teoría del
ramo (Teoría de Colas, Análisis Operacional) sobre datos propios en vez de sobre ejercicios.

### El hallazgo principal

Cuando mucha gente pelea por el mismo producto, las transacciones que esperan **retienen su
conexión a la base de datos**. El conjunto de conexiones disponibles (el *pool*) se agota, y
entonces **todo el sitio se vuelve lento** — incluso las páginas de catálogo que no tienen
nada que ver con ese producto.

Es decir: **la contención sobre una sola fila contagia su lentitud a un recurso que comparte
todo el sitio.**

---

## Parte 3 — Guion del video

Duración objetivo: **10 a 12 minutos**. Se puede grabar por partes y unir después.

> **Requisito del enunciado:** quien presenta debe estar **visible, de frente a la cámara, en
> una ventana**, con la presentación de fondo. Deben aparecer **todos los integrantes**.

### Bloque 1 — Presentación (1 min)

- Nombres de los integrantes y el ramo
- Qué es Pisada y qué se evaluó
- Frase clave: *"El objetivo no es la tienda, es medir cómo se comporta bajo carga."*

### Bloque 2 — Arquitectura (2 min)

Mostrar el diagrama del `README.md`.

Puntos a mencionar:
- **Next.js + PostgreSQL**, empaquetado en Docker y desplegado en Render
- **Sin ORM, SQL directo.** Razón: el trabajo analiza el costo de las consultas, y un ORM las
  esconde
- **En contenedor y no serverless.** Razón: serverless no deja ver la utilización de CPU y
  memoria, que es justo lo que había que medir
- **Las tres páginas tienen peso distinto a propósito**: home 20 ms, detalle 20 ms, catálogo
  44 ms. Esa diferencia es material experimental

### Bloque 3 — Demostración del sitio (2 min)

En https://pisada.onrender.com, recorrer en vivo:

1. **Home** → destacados
2. **Catálogo** → aplicar un filtro por categoría y otro por talla. Mencionar que los filtros
   obligan a agregar sobre 4552 variantes
3. **Ficha de producto** → mostrar la **matriz de tallas**, señalando que las combinaciones
   agotadas aparecen tachadas
4. **Agregar al carrito** → **Pagar** → mostrar la confirmación
5. Mencionar que el pago es simulado y no procesa dinero real

### Bloque 4 — Google Analytics 4 (1 min)

Mostrar el panel de GA4 (`G-P8EWE6D7G3`) con:
- Los eventos del embudo: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
- El evento propio `compra_sin_stock`, que explica por qué se pierden conversiones bajo carga
- Mencionar que el profesor tiene acceso a la propiedad

### Bloque 5 — Generadores de carga (2 min)

Mostrar `carga/escenarios/comun.js`.

- Se usó **k6** con un modelo **CBMG** (*Customer Behavior Model Graph*), el del material de
  cátedra
- **Los usuarios no siguen un guion fijo**: transitan entre páginas con probabilidades. Solo
  el 12 % de quienes ven un producto lo agregan al carrito
- Por qué importa: si todos compraran, el 100 % llegaría al checkout, algo que no pasa en
  ningún comercio real. La conversión medida fue **6,8 %**
- Los cuatro escenarios: carga baja, sostenida, pico y **contención sobre un mismo SKU**

### Bloque 6 — Resultados (2 min)

Mostrar las tablas de `docs/informe-fase1.md`, sección 5.

**Los tres escenarios:**

| Escenario | Usuarios | p(95) | Error |
|---|---|---|---|
| Baja | 5 | 37,65 ms | 0 % |
| Normal | 25 | 36,12 ms | 0 % |
| Pico | 350 | 118,72 ms | 0,01 % |

**La curva de utilización de CPU:** 9,2 % con 25 usuarios, hasta 76,1 % con 350.

**El detalle fino:** la CPU *por usuario* **baja** (de 0,368 % a 0,217 %). Significa que cada
usuario pasa más tiempo esperando que siendo atendido. **Es la señal del encolamiento, y
aparece antes de que la lentitud se note.**

**Las leyes del ramo, verificadas con datos propios:**
- Ley de Utilización: `U = X · S` → 35,1 %, cerró exacto
- Ley de Amdahl: el checkout **no puede mejorar más de 13,9 veces** por mucha CPU que se le
  agregue, porque el 7,2 % de su tiempo es espera serializada. Bajo contención ese techo cae
  **bajo 5 veces**

### Bloque 7 — Cuellos de botella y mejoras (1,5 min)

**El cuello de botella no era el obvio.** No es la CPU ni la base: es el **pool de
conexiones**, y llega ahí por contagio desde la contención de stock.

**Propuestas, con la evidencia que las respalda:**
1. Eliminar el `COUNT(*)` de la paginación: cuesta **4,55 ms, el 54 % de lo que cuesta el
   listado**, sin devolver una sola fila
2. No retener la conexión mientras se espera el bloqueo
3. Repartir el inventario de los productos populares en varias filas

### Bloque 8 — Conclusiones y honestidad metodológica (1,5 min)

Este bloque **vale mucho**. Mencionar que el informe documenta **cuatro errores de método
propios**, detectados y corregidos:

1. El generador de carga **no ejercitaba el checkout** por un defecto, y reportaba tiempos
   excelentes. *"Un generador con un defecto silencioso no falla: miente."*
2. El inventario se agotó a mitad de un experimento y se midieron rechazos en vez de compras
3. El instrumento medía intervalos distintos en cada estrategia, sesgando la comparación
4. **Los resultados de contención no son reproducibles**: entre corridas idénticas el p(95)
   varió dos órdenes de magnitud

Frase de cierre sugerida:

> *"Con la evidencia disponible no podemos afirmar cuál estrategia de concurrencia es mejor.
> Preferimos decirlo antes que elegir la corrida que nos convenía."*

---

## Parte 4 — Herramientas para grabar

| Para qué | Herramienta |
|---|---|
| Grabar pantalla + cámara en ventana | **OBS Studio** (gratis) o **Zoom** grabando una reunión |
| Unir fragmentos | **Clipchamp** (ya viene en Windows) |
| Subir | YouTube **como no listado**, o Google Drive con permiso de lectura |

En OBS: *Fuentes → + → Captura de pantalla*, y luego *+ → Dispositivo de captura de video*
para la cámara. Arrastrar la cámara a una esquina.

---

## Parte 5 — Lista de verificación antes de entregar

- [ ] Aparecen **todos** los integrantes
- [ ] Cada presentador está **visible, de frente**, en una ventana
- [ ] La presentación se ve de fondo
- [ ] Se aplicó el **Manual de Identidad Visual de UTEM**
- [ ] Duración entre 10 y 12 minutos
- [ ] El audio se entiende
- [ ] El enlace es accesible para el profesor

---

## Si algo no calza

Todo lo afirmado acá está respaldado en el repositorio:

| Tema | Archivo |
|---|---|
| Resultados y datos | `docs/informe-fase1.md` |
| Cómo se obtuvo cada dato | `docs/hallazgos.md` |
| Teoría aplicada | `docs/marco-teorico.md` |
| Por qué se decidió cada cosa | `docs/decisiones.md` |
