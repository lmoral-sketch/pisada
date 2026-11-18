# Prompt de montaje del video

Versión verificada contra el repositorio el 17 de noviembre de 2026. Parte del prompt
redactado por Catalina Araniz; se corrigen seis puntos que no calzaban con el estado real del
proyecto, marcados con ⚠️ en las notas del final.

---

## El prompt

Crea **únicamente el video de pantalla** que usaremos como fondo de nuestra defensa de Pisada.
Nosotros agregaremos después nuestras voces y cámaras. Entrega un **MP4 sin pista de audio**,
en 1920 × 1080, horizontal 16:9 y 30 fps. Deja la imagen limpia, sin avatares, rostros,
recuadros vacíos de cámara ni subtítulos del diálogo.

**Edita primero contra el guion.** Lee `docs/guion-video.md` del repositorio
`https://github.com/lmoral-sketch/pisada`. Conserva la duración de **12:00**. Los nombres de
los integrantes y los diálogos sirven para sincronizar la edición y quedarán fuera de la
imagen, salvo los nombres que ya figuren en la portada del equipo.

**Así debe calzar la imagen con nuestra futura narración:** si el guion dice «selecciono la
talla 40», primero debe verse la ficha, en ese instante debe ocurrir la selección y después
debe quedar visible el estado seleccionado. Si dice «en el carrito vemos el mismo modelo,
talla y color», cambia al carrito en esa frase y deja tiempo para leer los tres datos. Aplica
este criterio a todo el video, incluidos el código, las capturas de GA4 y los gráficos.
Mantén estable cada plano hasta que la siguiente frase justifique el cambio.

### Línea de tiempo

| Tiempo | Imagen que debe quedar en el video |
|---|---|
| **00:00–00:15** | Portada de Pisada y UTEM. Al terminar la introducción del guion, cortar directamente al inicio de la tienda. |
| **00:15–01:11** | **Demo real de compra.** Señales: **00:15** inicio de Pisada · **00:21** catálogo · **00:28** filtro «Zapatillas urbanas» · **00:35** filtro de talla 40 · **00:41** ficha «Ruta 7 Oasis Pro» · **00:48** selección Azul noche, talla 40 (SKU `PSD-2-5-4`) · **00:54** producto agregado · **00:58** carrito con esa variante · **01:05** confirmación del pedido simulado. Sostener la confirmación hasta **01:11**. Priorizar grabación continua del sitio conservando estas señales. |
| **01:11–01:24** | **Mi cuenta.** Registro e inicio de sesión con cuenta de demostración. Recortar el ingreso de credenciales. |
| **01:24–02:00** | **Webpay Plus en sandbox.** Segundo recorrido desde un carrito con producto: clic en «Pagar con Webpay», redirección a Transbank y retorno a Pisada. Usar la confirmación que corresponda a **esa** transacción, no la del checkout propio mostrado antes. |
| **02:00–04:00** | **Arquitectura.** Seguir la misma variante desde la ficha hasta el inventario. Alternar el diagrama del README, el fragmento de `web/src/lib/checkout.ts` y la tabla de espera del pool (§6.2 del informe: 4, 40 y 222 peticiones esperando con 100, 200 y 350 usuarios) en los instantes que marca el guion. |
| **04:00–06:00** | **GA4.** Usar las capturas de `docs/assets/ga4/`. Destacar una fila por vez al llegar a `view_item`, `add_to_cart`, `begin_checkout` y `purchase` sobre `03-eventos-del-embudo.png`; **cambiar a `04-evento-propio.png`** para `compra_sin_stock`, que no está en la tabla anterior. Después, mostrar la tabla de tiempos medidos en el navegador (§5.7) y resaltar la fila del catálogo al llegar a esa frase. |
| **06:00–08:00** | **Pruebas con k6.** Mostrar `carga/escenarios/comun.js` y ampliar la fila `producto` del bloque `CBMG`. Pasar a `baja.js`, `normal.js`, `pico.js` y `contencion.js` en el orden del guion. Encuadrar las líneas con los usuarios, la duración o la variante estudiada para que puedan leerse. |
| **08:00–10:00** | **Resultados.** Usar en orden: `percentiles-escenarios.svg`, `utilizacion-cpu.svg`, `cpu-por-usuario.svg` y `techo-amdahl.svg`, todos en `docs/graficos/`. El p(95) agregado de la corrida de pico es **1.568,16 ms**. Para las repeticiones del pool **no hay gráfico**: mostrar la tabla de §7.5 del informe, con los rangos solapados de las tres configuraciones. |
| **10:00–12:00** | **Cierre visual.** Evidencia de los **cinco** errores metodológicos siguiendo los turnos del guion. Cambiar de evidencia en **10:00, 10:24, 10:48, 11:12 y 11:36**. Terminar con la lámina de cierre en **12:00**. |

Utiliza la aplicación desplegada en `https://pisada.onrender.com`, las capturas auténticas, el
código y los resultados del equipo. Si el editor puede grabar el navegador, registra las
interacciones pendientes. Si falta una toma, identifícala con su tiempo exacto en la hoja de
montaje y conserva su duración en el borrador para que los bloques posteriores sigan calzando.
**Nunca reconstruyas una pantalla de pago o de analítica para hacerla pasar por evidencia
real.**

**Entrega dos elementos:** el MP4 visual y una **hoja de sincronización** con cuatro columnas:
`tiempo de entrada`, `tiempo de salida`, `frase exacta del guion` y `acción o evidencia
visible`. Coloca las señales también como marcadores en el proyecto editable si la herramienta
lo permite. Los tiempos y marcadores deben quedar fuera de la imagen exportada.

---

## Qué se verificó y qué se corrigió

### Lo que estaba bien

| Dato del prompt | Verificación |
|---|---|
| Bloques en 02:00 / 04:00 / 06:00 / 08:00 / 10:00 / 12:00 | ✅ Calzan exactamente con los seis bloques de `guion-video.md` |
| «Ruta 7 Oasis Pro» | ✅ Existe, slug `ruta-7-oasis-pro` |
| Talla 40, color «Azul noche» | ✅ Existen; la variante es `PSD-2-5-4`, categoría Zapatillas urbanas, stock 13 |
| Filtro «Zapatillas urbanas» | ✅ Es una de las siete categorías reales |
| **p(95) de 1.568,16 ms** | ✅ **Correcto, y el informe estaba mal.** Ver abajo |

### ⚠️ Las seis correcciones

1. **El informe tenía mal el p(95) del pico.** Decía «1.560 ms» y el dato crudo de
   `carga/resultados/pico.json` es **1.568,16 ms**. El p(99) decía 2.330 y es 2.339,29. Eran
   redondeos hacia abajo, mal hechos. **Se corrigieron en el informe, `PROYECTO.md` y la
   auditoría a partir de esta revisión.** El prompt de Catalina traía el número correcto.

2. **No existe gráfico del tamaño del pool.** El prompt pedía «usar el gráfico corregido».
   Ese gráfico se **eliminó** el 17 de noviembre: representaba el hallazgo de E-15, que no se
   reprodujo al repetir el experimento (E-16). En su lugar va la tabla de §7.5 con los rangos
   solapados.

3. **Tres archivos citados no están en el repositorio:** `Pisada_guion_y_prompt.md`,
   `Pisada_demo_checkout.mp4` y `Pisada_resultados_k6.mp4`. Si existen en el computador de
   Catalina, hay que **adjuntarlos a la herramienta de edición**, porque un editor que solo
   tenga el repositorio no los va a encontrar. Las referencias a ellos se reemplazaron por las
   señales de tiempo, que se sostienen solas.

4. **`compra_sin_stock` no está en la captura de eventos.** Está solo en
   `04-evento-propio.png`, que es la vista de Tiempo real. La instrucción de «destacar una
   fila por vez» sobre una sola imagen no era ejecutable para los cinco eventos.

5. **El pedido n.º 41 no se puede garantizar.** Los números de pedido dependen de las compras
   que se hayan hecho antes en la base. Se dejó como «el pedido simulado» sin número.

6. **El bloque «Mi cuenta» (01:11–01:24) no tiene diálogo en el guion.** Es correcto mostrarlo
   —el registro y el inicio de sesión son un requisito del enunciado— pero Catalina no tiene
   línea escrita para esos 13 segundos. O los narra sobre la demo, o conviene agregar una
   frase corta en el bloque 1.
