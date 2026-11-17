# Las 4 capturas de GA4 que faltan

Es el último entregable que depende de ti. Unos 15 minutos.

El enunciado pide textualmente *"configuración de GA4 documentada con capturas"*. La
configuración ya está documentada en texto en [`docs/despliegue.md`](../../despliegue.md); lo
que falta son las imágenes.

**Guarda cada archivo en esta misma carpeta**, con el nombre exacto de la tabla. El informe ya
las referencia: en cuanto los archivos existan, aparecen solas en §3.1 y no hay que tocar nada
más.

Atajo para capturar en Windows: **`Win + Shift + S`** → selecciona el área → se copia al
portapapeles → pégala en Paint y guarda como PNG. O `Win + Impr Pant` para la pantalla
completa, que queda en `Imágenes/Capturas de pantalla`.

---

## 1. `01-flujo-de-datos.png` — la configuración del flujo

**Dónde:** panel de GA4 → **Administrar** (engranaje abajo a la izquierda) → **Flujos de
datos** → click en el flujo del sitio.

**Qué tiene que salir en la imagen:**

- El **ID de medición `G-P8EWE6D7G3`**
- La **URL del flujo**: `https://pisada.onrender.com`
- El nombre del flujo

**Por qué esta:** es la que prueba que la propiedad está conectada al sitio real desplegado, no
a localhost. Es la captura más importante de las cuatro.

---

## 2. `02-acceso-del-profesor.png` — el acceso de `j.aranda@utem.cl`

**Dónde:** **Administrar** → **Gestión de accesos a la propiedad**.

**Qué tiene que salir:**

- La fila con **`j.aranda@utem.cl`**
- Su rol: **Analista**

**Por qué esta:** el enunciado pide dar acceso al profesor. Esta imagen es la única prueba de
que se hizo. Si solo sacaras una captura, saca esta.

> Si el correo aparece como "invitación pendiente" en vez de aceptado, captúralo igual: muestra
> que la invitación se envió.

---

## 3. `03-eventos-del-embudo.png` — los eventos registrados

**Dónde:** **Informes** → **Participación** → **Eventos**.

**Qué tiene que salir:** la tabla de eventos con sus conteos, donde se vean los cuatro del
embudo:

| Evento | Cuándo se dispara |
|---|---|
| `view_item` | Al ver una ficha de producto |
| `add_to_cart` | Al agregar una talla al carrito |
| `begin_checkout` | Al pulsar pagar |
| `purchase` | Al confirmarse el pedido |

**Si la tabla sale con pocos eventos o vacía:** usa **Informes → Tiempo real** y navega el
sitio en otra pestaña mientras capturas. Los eventos aparecen en segundos. Es mejor una captura
de Tiempo real con datos que una de Eventos vacía.

---

## 4. `04-evento-propio.png` — `compra_sin_stock`

**Dónde:** misma pantalla de **Eventos**, pero con el evento `compra_sin_stock` visible en la
lista. Puedes usar el buscador de la tabla para filtrarlo y que quede destacado.

**Por qué esta:** `compra_sin_stock` **no es un evento estándar de GA4**, lo definimos
nosotros. Es lo que explica por qué la conversión cae bajo carga —el inventario se agota— en
vez de dejar una caída sin causa aparente en el informe.

Para generarlo si no existe todavía: en el sitio, entra a un producto, elige una talla
**agotada**... si la interfaz no te deja, agrega una talla al carrito, espera a que otra
compra la agote, o simplemente captura la lista de eventos tal como esté y menciónalo en el
video.

---

## Si GA4 no muestra datos

GA4 demora hasta 24–48 horas en consolidar los informes estándar. **Tiempo real** funciona al
instante.

Para las capturas 3 y 4, si los informes estándar están vacíos:

1. Abre el sitio en una pestaña y GA4 → **Tiempo real** en otra
2. Navega: home → catálogo → ficha → agregar al carrito → pagar
3. Los eventos van apareciendo en Tiempo real
4. Captura esa pantalla

En el video, Bianca ya tiene la frase prevista para este caso: *"demora en consolidar"* y
muestra Tiempo real.

---

## Cuando termines

Deja los 4 PNG en esta carpeta y avísame: yo los enlazo en el informe, actualizo la auditoría
de cumplimiento y los dejo comiteados.

Si alguna no la pudiste sacar, también avísame cuál y por qué: es mejor declararlo en el
informe que dejar un hueco.
