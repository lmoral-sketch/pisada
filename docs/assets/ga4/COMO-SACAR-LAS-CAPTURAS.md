# Las 4 capturas de GA4 que faltan

Es el último entregable que depende de ti. Unos 5 minutos con los enlaces directos de abajo.

> **Por qué no las saqué yo.** Entré a la propiedad desde tu Chrome y verifiqué que todo está
> en orden (ver «Lo que quedó verificado» al final), pero el panel de administración de GA4
> congela el mecanismo de captura de pantalla del navegador: cada intento se quedó esperando.
> Las pantallas de informes sí se dejaban capturar; las de **Administrar**, no. Tú con
> `Win + Shift + S` lo haces en un minuto y además a resolución completa, que para el informe
> es mejor.

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

## Enlaces directos

Pegalos en Chrome con tu cuenta **lmoral@utem.cl** activa (el `authuser=1` ya la elige):

| Captura | Enlace |
|---|---|
| **1** — flujo de datos | `https://analytics.google.com/analytics/web/?authuser=1#/a415179584p562888744/admin/streams/table/16283906970` |
| **2** — acceso del profesor | `https://analytics.google.com/analytics/web/?authuser=1#/a415179584p562888744/admin/suiteusermanagement/property` |
| **3 y 4** — eventos | `https://analytics.google.com/analytics/web/?authuser=1#/a415179584p562888744/reports/intelligenthome` y después seguir los pasos de abajo |

> ✅ **Las capturas 1 y 2 ya están hechas** (17 de noviembre). Faltan la 3 y la 4, que salen
> las dos de la misma pantalla.

---

## 1. `01-flujo-de-datos.png` — la configuración del flujo

**Dónde:** el primer enlace de la tabla. Se abre directo el panel del flujo «Pisada web».

**Qué tiene que salir en la imagen:**

- El **ID de medición `G-P8EWE6D7G3`**
- La **URL del flujo**: `https://pisada.onrender.com`
- El nombre del flujo

**Por qué esta:** es la que prueba que la propiedad está conectada al sitio real desplegado, no
a localhost. Es la captura más importante de las cuatro.

---

## 2. `02-acceso-del-profesor.png` — el acceso de `j.aranda@utem.cl`

**Dónde:** el segundo enlace de la tabla.

**Qué tiene que salir:**

- La fila con **`j.aranda@utem.cl`**
- Su rol: **Analista**

**Por qué esta:** el enunciado pide dar acceso al profesor. Esta imagen es la única prueba de
que se hizo. Si solo sacaras una captura, saca esta.

> Si el correo aparece como "invitación pendiente" en vez de aceptado, captúralo igual: muestra
> que la invitación se envió.

---

## 3. `03-eventos-del-embudo.png` — los eventos registrados

**Esta es la que no encontraste. El problema es que está en Informes, no en Administrar.**

### Cómo llegar, click por click

1. Abre `https://analytics.google.com/analytics/web/?authuser=1#/a415179584p562888744/reports/intelligenthome`
2. Si te quedó abierto el panel blanco de Administrar, **ciérralo con la X** de arriba a la
   izquierda (la misma X que se ve en tus dos capturas anteriores).
3. Mira la **barra de iconos estrecha del borde izquierdo**, la que tiene el logo de Analytics
   arriba. De arriba hacia abajo hay cuatro iconos:

   | Icono | Qué es |
   |---|---|
   | 🏠 casa | Página principal |
   | 📊 barras | **Informes** ← este |
   | ◔ burbujas | Explorar |
   | ⊚ diana | Publicidad |

4. Click en el **segundo icono, el de barras (Informes)**.
5. Se abre un menú a la izquierda. Busca **«Ciclo de vida»** y dentro **«Interacción»**
   (en algunas cuentas aparece como **«Participación»**).
6. Click en **«Eventos»**.

> **Atajo si te pierdes:** arriba hay una barra de búsqueda que dice *"Prueba a buscar..."*.
> Escribe **`eventos`** y en los resultados elige el informe «Eventos». Llegas igual.

### Qué tiene que salir en la imagen

Una tabla con la columna **«Nombre del evento»** y al lado el **recuento de eventos**. Tienen
que verse estos cuatro:

| Evento | Cuándo se dispara |
|---|---|
| `view_item` | Al ver una ficha de producto |
| `add_to_cart` | Al agregar una talla al carrito |
| `begin_checkout` | Al pulsar pagar |
| `purchase` | Al confirmarse el pedido |

Van a aparecer también otros que GA4 agrega solo (`page_view`, `session_start`,
`first_visit`, `scroll`, `user_engagement`). **Eso está bien, no los escondas**: muestran que
la medición mejorada está activa.

> Tu propiedad ya tiene **114 eventos y 6 compras** registrados, así que la tabla va a salir
> con datos. No necesitas Tiempo real.

---

## 4. `04-evento-propio.png` — `compra_sin_stock`

**Sale de la misma pantalla que la 3.** No tienes que ir a ningún otro lado.

### Cómo

1. Quédate en el informe **Eventos** de la captura anterior.
2. Sobre la tabla hay un **buscador pequeño** (una lupa con el texto *"Buscar..."*).
3. Escribe **`compra_sin_stock`**.
4. La tabla queda con esa sola fila. **Esa es la captura.**

### Si no aparece

Significa que todavía ningún usuario intentó comprar algo agotado. Para generarlo:

1. Abre `https://pisada.onrender.com/catalogo` en otra pestaña
2. Entra a varios productos hasta encontrar uno con **tallas tachadas**
3. Intenta agregar esa talla al carrito
4. Vuelve a GA4 → **Informes → Tiempo real** y espera unos segundos: ahí aparece al instante

Si aun así no lo logras, **captura la tabla de eventos completa sin filtrar** y avísame: lo
declaramos en el informe. Es preferible decir que el evento está implementado y no alcanzó a
dispararse, a dejar un hueco.

---

## Cuando termines

Deja los 4 PNG en esta carpeta y avísame: yo los enlazo en el informe, actualizo la auditoría
de cumplimiento y los dejo comiteados.

Si alguna no la pudiste sacar, también avísame cuál y por qué: es mejor declararlo en el
informe que dejar un hueco.


---

## Lo que quedó verificado el 17 de noviembre

Entré a la propiedad y confirmé, aunque no pudiera capturarlo en imagen:

| Dato | Estado |
|---|---|
| Propiedad | **Pisada**, cuenta `a415179584`, propiedad `p562888744` |
| ID de medición | **`G-P8EWE6D7G3`** ✅ coincide con el del proyecto |
| Flujo de datos | «Pisada web» → **`https://pisada.onrender.com`**, ID de flujo `16283906970` |
| Tráfico | *«Ha recibido tráfico durante las últimas 48 horas»* ✅ |
| Acceso del profesor | **Javier Etienne Aranda Bellenger — `j.aranda@utem.cl` — rol Analista** ✅ |
| Tu acceso | `lmoral@utem.cl` — Administrador |
| Datos en el panel | 5 usuarios activos, **114 eventos**, 6 eventos clave, **6 compras** |

O sea: **la configuración está correcta y el profesor ya tiene acceso.** Lo único que falta
son las imágenes que lo documenten.

Las 6 compras registradas son buena noticia para la captura 3: los informes estándar ya
tienen datos, así que no deberías necesitar recurrir a Tiempo real.
