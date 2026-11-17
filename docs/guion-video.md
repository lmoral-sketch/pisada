# Guion del video

Guion operativo para los **cinco integrantes**. Cada bloque dice **quién presenta**, **qué
tiene exactamente en pantalla** y **qué decir encima**. El texto en cursiva se puede leer casi
literal.

**Duración objetivo:** 12 minutos
**Sitio:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada

---

## Reparto: dos minutos exactos por persona

Cinco bloques de contenido de **2:00** cada uno —uno por integrante— más un **cierre coral de
2:00** en el que los cinco vuelven a aparecer, cada uno con una frase.

| Bloque | Minutos | Tema | Presenta |
|---|---|---|---|
| 1 | 0:00 – 2:00 | Presentación y demostración del sitio en vivo | **Catalina Araniz** |
| 2 | 2:00 – 4:00 | Arquitectura, el recurso crítico y los cuellos de botella | **Gabriel Araya** |
| 3 | 4:00 – 6:00 | Google Analytics 4, embudo y experiencia bajo carga | **Bianca Torres** |
| 4 | 6:00 – 8:00 | Generadores de carga y modelo CBMG | **Matías Torres** |
| 5 | 8:00 – 10:00 | Resultados, leyes verificadas y propuestas | **Lucas Mora** |
| 6 | 10:00 – 12:00 | Cierre: los cinco errores de método | **Los cinco, en turnos** |

**Tiempo en cámara por persona:** 2:00 de bloque propio + unos 0:24 en el cierre =
**≈2:24 cada uno**. Exactamente parejo.

> El enunciado exige que participen todos. Con este reparto nadie queda de relleno y nadie
> carga con el doble de trabajo.

### Cómo grabar por separado

Cada uno graba **solo su bloque**, con la presentación de fondo y su cámara en una ventana.
Después se unen los fragmentos en orden con Clipchamp. No hace falta juntarse.

Para que los cortes no se noten:

- Empieza con la frase de enlace que trae tu bloque (viene escrita en cada uno)
- Usa la **misma presentación** (`docs/presentacion.html`), avanzando a tu lámina
- Graba a **1920×1080**

**El cierre (bloque 6) también se puede grabar por separado:** cada uno dice su frase mirando
a cámara y se montan las cinco seguidas. Si logran juntarse en una videollamada y grabarla,
mejor, pero no es obligatorio.

---

## Preparación técnica (15 minutos antes)

1. **Abre el sitio y déjalo cargado.** Render lo suspende tras 15 minutos sin uso y tarda
   hasta 50 segundos en despertar. Si lo abres recién al grabar, se ve congelado.

   ```
   https://pisada.onrender.com/catalogo
   ```

2. **Deja estas 5 pestañas abiertas, en este orden:**

   | # | Pestaña | La usa |
   |---|---|---|
   | 1 | `pisada.onrender.com` | Catalina |
   | 2 | `github.com/lmoral-sketch/pisada` | Gabriel, Matías |
   | 3 | `.../blob/master/docs/informe-fase1.md` | Gabriel, Bianca, Lucas |
   | 4 | El panel de GA4 | Bianca |
   | 5 | `docs/presentacion.html` abierto en el navegador | Todos |

3. **OBS Studio:**
   - Fuentes → **+** → *Captura de pantalla* (toda la pantalla)
   - Fuentes → **+** → *Dispositivo de captura de video* (tu cámara)
   - Arrastra la cámara a la esquina inferior derecha y achícala a un cuarto
   - Botón **Iniciar grabación**

4. Prueba el audio grabando 10 segundos y escuchándolos.

> **Puedes grabar por partes.** Si te equivocas, para, respira y vuelve a grabar ese bloque.

---

# BLOQUE 1 — Presentación y sitio en vivo (0:00 – 2:00)

## Presenta: Catalina Araniz

### Qué tienes en pantalla, en orden

| Momento | Pantalla |
|---|---|
| 0:00 – 0:30 | **Lámina 1** de la presentación (pestaña 5) |
| 0:30 – 0:50 | **Pestaña 1**, el home del sitio |
| 0:50 – 1:15 | **Pestaña 1**, el catálogo — aplica un filtro de categoría y otro de talla |
| 1:15 – 1:35 | **Pestaña 1**, una ficha de producto — señala las tallas tachadas |
| 1:35 – 2:00 | **Pestaña 1**, carrito → pago con Webpay → confirmación del pedido |

### Lámina 1 — presentación

> *"Hola, somos el grupo de Desempeño de Sistemas, INFB8091. Yo soy Catalina Araniz, y junto a
> Gabriel, Bianca, Lucas y Matías presentamos nuestro trabajo semestral.*
>
> *Construimos Pisada, una tienda de zapatillas e indumentaria urbana. Pero quiero partir
> aclarando algo: la tienda no es el objetivo del trabajo, es el sujeto de estudio. Lo que
> hicimos fue medir cómo se degrada un sitio web bajo carga, y explicar por qué, usando
> análisis operacional y teoría de colas.*
>
> *Les muestro primero el sitio funcionando."*

### Home — pestaña 1

**Qué haces:** entras a `pisada.onrender.com` y te quedas unos segundos en el home.

> *"Este es el sitio desplegado en Render, con la base de datos en Neon. El home es
> deliberadamente liviano: una sola consulta, veinte milisegundos."*

### Catálogo — aplica un filtro de categoría y después uno de talla

**Qué haces:** click en una categoría, después click en una talla. Que se vea recargar.

> *"El catálogo es, también a propósito, la página pesada. Hace tres consultas, y los filtros
> obligan a agregar sobre las 4552 variantes del inventario. Cuesta 44 milisegundos, el doble
> que el home.*
>
> *Esa diferencia de peso entre páginas no es un descuido: es material experimental. Nos
> permite ver cómo dos páginas se degradan de forma distinta bajo la misma carga."*

### Ficha de producto — señala con el cursor las tallas tachadas

**Qué haces:** abre un producto y pasa el cursor por la matriz de tallas, deteniéndote en una
tachada.

> *"Acá está la matriz de tallas. Algunas aparecen tachadas: son combinaciones sin stock. Un
> doce por ciento del catálogo nace agotado, a propósito, porque genera puntos de abandono
> medibles en el embudo de conversión."*

### Carrito y pago — este es el momento importante del bloque

**Qué haces:** elige una talla disponible → *Agregar al carrito* → ve al carrito → elige
**pagar con Webpay** → en la pasarela de Transbank usa una tarjeta de prueba → vuelve al sitio
y muestra la confirmación del pedido.

> *"Agregamos una talla y vamos al carrito. Y acá está el pago: el enunciado pedía simular el
> checkout con el sandbox de un medio de pago chileno, así que integramos **Transbank Webpay
> Plus** en su ambiente de integración.*
>
> *Esto es el flujo real: se crea la transacción, redirige a la pasarela de Transbank, pago con
> tarjeta de prueba, autenticación, y vuelve a nuestro sitio con el pedido creado."*

**Muestra la confirmación en pantalla y agrega:**

> *"Una precisión metodológica: el sitio tiene **dos caminos de pago**. Este, con Webpay, y uno
> propio sin pasarela externa. Los dos comparten exactamente la misma función de descuento de
> inventario, así que el recurso crítico se trata igual en ambos.*
>
> *Medimos que las llamadas a Transbank suman 537 milisegundos, frente a los 50 del checkout
> propio. Si hubiéramos puesto las pruebas de carga sobre este camino, el 91 % del tiempo
> medido habría sido tiempo de un tercero, enterrando la contención sobre el stock que es
> justamente lo que estudiamos. Por eso las pruebas de carga corren sobre el camino propio, y
> lo declaramos en el informe."*

> ⚠️ **Catalina, esto es clave:** NO digas que no integramos un sandbox. **Sí está integrado y
> funciona**, verificado de extremo a extremo. Si la pasarela falla el día de la grabación,
> muestra la sección 8.5 del informe y dilo desde ahí.

---

# BLOQUE 2 — Arquitectura y cuellos de botella (2:00 – 4:00)

## Presenta: Gabriel Araya

### Qué tienes en pantalla, en orden

| Momento | Pantalla |
|---|---|
| 2:00 – 2:20 | **Pestaña 2**, el diagrama de arquitectura del README |
| 2:20 – 2:45 | **Lámina 3** — «Tres decisiones que condicionaron todo» |
| 2:45 – 3:10 | **Pestaña 1**, ficha de producto, señalando la matriz de tallas |
| 3:10 – 3:40 | **Lámina 8** — «Tres colas encadenadas» |
| 3:40 – 4:00 | **Pestaña 3**, sección 6 del informe |

### Frase de enlace

> *"Siguiendo con lo que mostró Catalina, yo les cuento cómo está construido por dentro."*

### Diagrama del README — pestaña 2

**Qué haces:** baja hasta el diagrama de la arquitectura y déjalo en pantalla.

> *"La arquitectura es Next.js con PostgreSQL 16, empaquetado en Docker y desplegado en Render,
> con la base de datos en Neon. La aplicación y la base están las dos en la región de Ohio, a
> propósito: la latencia entre aplicación y base se paga en cada consulta."*

### Lámina 3 — las tres decisiones

> *"Hay tres decisiones que condicionaron todo el trabajo.*
>
> *La primera: SQL directo, sin ORM. Un ORM genera las consultas por nosotros y las esconde.
> Como este trabajo analiza el costo de cada consulta, necesitábamos verlas, y además
> necesitábamos escribir `SELECT FOR UPDATE` explícito.*
>
> *La segunda: contenedor y no serverless. Un entorno serverless escala solo y no expone la
> utilización de CPU y memoria, que es justo lo que hay que medir. Con serverless nuestro
> sitio nunca se habría saturado de forma observable.*
>
> *Y la tercera es la central del trabajo."*

### El recurso crítico — pestaña 1, ficha de producto

**Qué haces:** señala la matriz de tallas con el cursor mientras hablas.

> *"El inventario vive a nivel de SKU: producto más talla más color. Cada combinación tiene su
> propio stock. 240 productos nos dan 4552 variantes.*
>
> *¿Por qué importa? Porque al comprar hay que descontar stock de **una fila concreta**. Si
> veinte personas compran la misma talla del mismo modelo al mismo tiempo, tienen que hacer
> fila: la base las atiende de a una.*
>
> *Esa fila es una cola de espera real y medible. Es lo que nos permitió aplicar teoría de
> colas sobre datos nuestros, en vez de sobre ejercicios de pizarrón."*

### Lámina 8 — las tres colas

> *"Y acá está el resultado más interesante de la arquitectura: el sistema tiene **tres puntos
> de serialización encadenados**.*
>
> *El primero es el bloqueo de stock que acabo de describir.*
>
> *El segundo es el pool de conexiones. Las transacciones que esperan el bloqueo **retienen su
> conexión mientras esperan**, así que el pool de diez se agota. Con 350 usuarios medimos
> **222 peticiones esperando** una de las diez conexiones.*
>
> *Y el tercero es el event loop de Node, que procesa en un solo hilo. Con una CPU asignada,
> ese hilo no escala."*

### Pestaña 3, sección 6 — la precisión que hay que hacer

> *"Y acá tengo que ser preciso, porque es donde nos equivocamos y lo corregimos.*
>
> *Que el pool se encole está **medido**: cuatro peticiones esperando con 100 usuarios, cuarenta
> con 200, doscientas veintidós con 350. Eso es un hecho.*
>
> *Lo que **no** está demostrado es que agrandar el pool arregle el tiempo de respuesta.
> Medimos que subirlo de diez a veinte mejoraba el percentil 95 por un factor de casi seis, lo
> escribimos en el informe como confirmado, y al repetir el experimento no se reprodujo. Lucas
> cuenta ese caso completo.*
>
> *Así que lo decimos como corresponde: la cola del pool es un **fenómeno medido**, y que sea
> **la causa** de la degradación es una hipótesis plausible, no una conclusión."*

---

# BLOQUE 3 — Google Analytics 4 (4:00 – 6:00)

## Presenta: Bianca Torres

### Qué tienes en pantalla, en orden

| Momento | Pantalla |
|---|---|
| 4:00 – 4:30 | **Pestaña 4**, GA4 → *Informes* → *Participación* → *Eventos* |
| 4:30 – 5:00 | GA4, el evento `compra_sin_stock` señalado en la lista |
| 5:00 – 5:40 | **Pestaña 3**, sección 5.7 del informe (tabla con y sin carga) |
| 5:40 – 6:00 | La misma tabla del embudo, o GA4 → *Tiempo real* |

### Frase de enlace

> *"Yo me encargué de la instrumentación del lado del usuario."*

### GA4 — los eventos del embudo

**Qué haces:** muestra la lista de eventos con sus conteos.

> *"Instrumentamos el sitio con Google Analytics 4, propiedad G-P8EWE6D7G3. El profesor tiene
> acceso de Analista.*
>
> *Acá están los cuatro eventos del embudo que pedía el enunciado: `view_item` cuando se ve una
> ficha, `add_to_cart` al agregar una talla, `begin_checkout` al pulsar pagar, y `purchase`
> cuando se confirma el pedido."*

### El evento propio

**Qué haces:** señala `compra_sin_stock` en la lista de eventos.

> *"Y agregamos uno propio, `compra_sin_stock`, que no es estándar de GA4. Lo necesitábamos
> porque bajo carga el inventario se agota y las conversiones caen. Sin ese evento, en el
> informe se vería una caída de conversión **sin causa aparente**. Con él, la caída tiene
> nombre."*

### El problema metodológico — pestaña 3, sección 5.7

**Qué haces:** muestra la tabla que compara la navegación con y sin carga.

> *"Acá hay un problema que tuvimos que resolver y que vale la pena contar.*
>
> *GA4 mide con JavaScript en el navegador. Y **k6 no ejecuta JavaScript**: nuestros 350
> usuarios sintéticos no generan ni un solo evento de GA4. Son invisibles para la
> instrumentación del cliente.*
>
> *Así que diseñamos un protocolo de dos sesiones: una persona navega el sitio **de verdad**,
> en un navegador real, mientras k6 genera la carga de fondo. GA4 mide esa sesión real, y lo
> que queda registrado es la experiencia de un usuario humano en un sitio saturado."*

**Señala las cifras de la tabla.**

> *"El resultado: el catálogo pasó de 394 milisegundos a 989. Se degradó dos veces y media. El
> home, en cambio, casi no se movió.*
>
> *Eso confirma lo que explicaba Gabriel: las páginas pesadas se degradan antes. Y lo confirma
> con medición del lado del usuario, no con nuestras propias métricas del servidor."*

---

# BLOQUE 4 — Generadores de carga (6:00 – 8:00)

## Presenta: Matías Torres

### Qué tienes en pantalla, en orden

| Momento | Pantalla |
|---|---|
| 6:00 – 6:15 | **Lámina 4** — «Los usuarios no siguen un guion fijo» |
| 6:15 – 7:00 | **Pestaña 2** → `carga/escenarios/comun.js`, en el bloque `CBMG` |
| 7:00 – 7:25 | El mismo archivo, hablando de la conversión medida |
| 7:25 – 8:00 | **Pestaña 2** → carpeta `carga/escenarios/`, y después **lámina 5** |

### Frase de enlace

> *"Yo armé los generadores de carga, que es cómo producimos el tráfico que medimos."*

### El CBMG — pestaña 2, archivo `comun.js`

**Qué haces:** abre `carga/escenarios/comun.js` en GitHub y baja hasta la constante `CBMG`.
Déjala centrada en pantalla y señálala con el cursor.

> *"Usamos k6, pero no con un guion fijo. Implementamos un **Customer Behavior Model Graph**,
> que es el modelo del material de cátedra.*
>
> *Los usuarios sintéticos transitan entre páginas con probabilidades. Acá se ve: de los que
> ven un producto, solo el 12 % lo agrega al carrito, el 33 % vuelve al catálogo y el 35 % se
> va del sitio."*

### Por qué importa

> *"¿Por qué no un guion fijo? Porque si todos los usuarios compraran, el 100 % llegaría al
> checkout, y en ningún comercio real pasa eso: la conversión ronda el 1 a 3 %. Estaríamos
> midiendo un sistema ficticio, con el checkout sobrecargado y el catálogo subcargado.*
>
> *Con el CBMG medimos una conversión del 6,8 %, que está en el orden correcto.*
>
> *Y encontramos una conexión teórica que nos pareció potente: las probabilidades del CBMG son,
> literalmente, **las razones de visita de la ley del flujo forzado** de la Unidad 2. El modelo
> de carga web y las leyes operacionales son el mismo modelo visto desde dos ángulos."*

### Los escenarios — pestaña 2, carpeta `carga/escenarios/`

**Qué haces:** muestra la carpeta con los cuatro archivos, después pasa a la lámina 5.

> *"Corrimos cuatro escenarios: carga baja de 5 usuarios como línea base, carga sostenida de 25
> durante diez minutos, un escenario de pico que sube por escalones hasta 350, y uno extra de
> contención.*
>
> *Ese último no lo pedía el enunciado. Lo agregamos porque con 4552 variantes la probabilidad
> de que dos usuarios compren la misma combinación al mismo tiempo es ínfima, y toda la
> contención que queríamos estudiar quedaba invisible. Ese escenario fuerza a todos a competir
> por el mismo producto, como en un lanzamiento.*
>
> *Y acá hay algo que nos costó aprender: nuestro primer generador tenía un defecto y **no
> compraba nada**, pero reportaba tiempos excelentes. Lo cuento yo mismo en el cierre."*

---

# BLOQUE 5 — Resultados y propuestas (8:00 – 10:00)

## Presenta: Lucas Mora

### Qué tienes en pantalla, en orden

| Momento | Pantalla |
|---|---|
| 8:00 – 8:20 | `docs/graficos/percentiles-escenarios.svg` |
| 8:20 – 8:35 | `docs/graficos/utilizacion-cpu.svg` |
| 8:35 – 9:00 | `docs/graficos/cpu-por-usuario.svg` |
| 9:00 – 9:20 | **Pestaña 3**, sección 5.3 del informe (leyes operacionales) |
| 9:20 – 9:40 | `docs/graficos/techo-amdahl.svg` |
| 9:40 – 10:00 | **Lámina 9** — «Dos refutadas, tres en pie» |

### Frase de enlace

> *"Yo analicé los resultados. Y hay tres que vale la pena ver."*

### Percentiles — `percentiles-escenarios.svg`

> *"Estos son los percentiles de los tres escenarios. Con 5 usuarios el percentil 95 es de 37
> milisegundos. Con 25 es prácticamente igual, 36. Y recién en el pico, con 350 usuarios, sube
> a 118. La tasa de error se mantuvo en 0,01 %: el sistema nunca colapsó."*

### Utilización de CPU — `utilizacion-cpu.svg`

> *"Acá está la curva de utilización de CPU. Crece casi lineal, de 9 % con 25 usuarios a 76 %
> con 350."*

### CPU por usuario — `cpu-por-usuario.svg`

**Este es el gráfico importante del bloque. Déjalo en pantalla el tiempo completo.**

> *"Pero este es el gráfico interesante. Es la CPU consumida **por usuario**, y decrece: de
> 0,368 a 0,217 por ciento.*
>
> *¿Qué significa? Que cada usuario consume menos CPU por unidad de tiempo, porque pasa
> proporcionalmente más rato **esperando** que siendo atendido. Esa es la firma del
> encolamiento, y aparece **antes** de que la lentitud se note en el tiempo de respuesta. Es un
> indicador temprano de saturación."*

### Las leyes — pestaña 3, sección 5.3

> *"Verificamos dos leyes del ramo con datos propios, no citadas.*
>
> *La ley de utilización, U igual a X por S, nos cerró exacta: 35,1 %, con un tiempo de servicio
> de 11,27 milisegundos de CPU por petición.*
>
> *Y la ley de Little nos permitió estimar cuántas transacciones estaban en promedio haciendo
> cola por el bloqueo de stock, que es un número que no se puede observar directamente."*

### Amdahl — `techo-amdahl.svg`

> *"Y esto es la ley de Amdahl calculada con nuestros datos.*
>
> *El 7,2 % del tiempo del checkout es espera serializada sobre el bloqueo de stock. Esa
> fracción no se paraleliza, así que por mucha CPU que agreguemos, el checkout no puede mejorar
> más de 13,9 veces. Bajo contención alta esa fracción sube y el techo se desploma a menos de
> cinco.*
>
> *Escalar por hardware tiene un límite calculable. Para bajarlo hay que cambiar el diseño, no
> comprar más máquina."*

### Lámina 9 — las propuestas, con dos refutadas

> *"De ahí salen nuestras propuestas. Y quiero mostrar primero las dos que **refutamos nosotros
> mismos**, porque eso también es resultado.*
>
> *La primera: eliminar el conteo exacto de la paginación. Medimos que cuesta 4,55
> milisegundos, el 54 % del costo del listado, sin devolver una sola fila de datos. Parecía
> obvio. Lo implementamos, lo medimos, y **no funcionó**: con 240 productos esos milisegundos
> no son cómputo, son **costo fijo por consulta**. Reemplazar una consulta barata por otra
> consulta barata no ahorra nada. El número era correcto; nuestra interpretación del número era
> falsa.*
>
> *La segunda: subir el pool de conexiones de diez a veinte. Esa medición nos dio una mejora de
> casi seis veces en el percentil 95. La escribimos en el informe como confirmada, cambiamos la
> configuración del proyecto, hicimos un gráfico. Y auditando nuestro propio trabajo nos dimos
> cuenta de que la habíamos medido **una sola vez por configuración**. La repetimos tres veces
> cada una y los rangos **se solapan por completo**: no hay diferencia demostrable. Revertimos
> todo.*
>
> *Las que siguen en pie son tres: no retener la conexión mientras se espera el bloqueo,
> repartir el inventario de los productos populares en varias filas —la técnica de los
> contadores distribuidos— y un índice de texto para la búsqueda por nombre."*

---

# BLOQUE 6 — Cierre coral: los cinco errores (10:00 – 12:00)

## Presentan: los cinco, en turnos de unos 20 segundos

**Pantalla:** **lámina 10** —«Cinco errores propios»— durante todo el bloque, y la **lámina 11**
en la última frase.

**Cómo se graba:** cada uno dice su frase mirando a cámara. Si se graba por separado, se montan
las cinco seguidas. Lo ideal es que la cámara de quien habla se vea grande; basta con que se
alternen.

### Catalina abre

> *"Para cerrar queremos mostrar algo que normalmente no se muestra: los cinco errores de
> método que cometimos nosotros. Están todos en la sección 8 del informe, y los consideramos
> parte del resultado."*

### Error 1 — **Matías**

> *"El primero es mío. Nuestro generador de carga tenía un defecto y **no ejercitaba el
> checkout**: descartaba todos los botones de talla por un problema con las clases de CSS.
> Ningún usuario sintético compró nunca nada. Y lo grave es que esa corrida reportaba tiempos
> excelentes y cero errores.*
>
> *La lección: un generador con un defecto silencioso no falla. **Miente.**"*

### Error 2 — **Gabriel**

> *"El segundo: en un experimento se nos **agotó el inventario** a mitad de la corrida. La
> segunda mitad estuvo midiendo rechazos rápidos en vez de compras con bloqueo.*
>
> *El resultado decía que la contención **mejoraba** el desempeño. Era el recurso medido
> desapareciendo, no el sistema andando mejor."*

### Error 3 — **Bianca**

> *"El tercero: nuestro propio instrumento **medía intervalos distintos** en cada estrategia de
> concurrencia. En una cronometraba solo el bloqueo; en la otra, toda la función.*
>
> *La comparación estaba sesgada **por construcción**, antes de correr el primer experimento."*

### Error 4 — **Lucas**

> *"El cuarto: al repetir el experimento de contención, el percentil 95 varió **dos órdenes de
> magnitud** entre corridas idénticas, y el orden entre las dos estrategias se invirtió.*
>
> *Así que nuestra conclusión en ese punto es que **no podemos afirmar** cuál estrategia es
> mejor con la evidencia disponible. Preferimos decirlo antes que elegir la corrida que nos
> convenía."*

### Error 5 — **Catalina cierra**

**Cambia a la lámina 11 en esta frase.**

> *"Y el quinto lo encontramos auditando nuestro propio trabajo, dos días antes de entregarlo.*
>
> *Habíamos publicado como confirmado el hallazgo del pool de conexiones: una mejora de casi
> seis veces. Estaba en el informe, en la configuración del proyecto y en un gráfico. Nuestro
> argumento para aceptarlo había sido que la diferencia era demasiado grande para ser azar.*
>
> *Repetimos el experimento y se cayó.*
>
> *La lección es la que nos llevamos del ramo: **una diferencia grande no es una diferencia
> robusta.** En un sistema con colas, la variabilidad entre corridas de la misma configuración
> es un resultado que hay que medir, no un ruido que se promedia.*
>
> *Lo aprendimos refutando una conclusión nuestra que ya estaba escrita.*
>
> *Somos Catalina, Gabriel, Bianca, Lucas y Matías. Muchas gracias."*

---

## Checklist antes de subir

- [ ] Los 5 integrantes aparecen en su bloque **y** en el cierre
- [ ] Cada uno está visible, de frente a la cámara, en una ventana
- [ ] La presentación se ve de fondo
- [ ] Logo y colores UTEM aplicados
- [ ] Entre 11 y 13 minutos
- [ ] El audio se entiende en los cinco fragmentos (revisen el más bajo)
- [ ] El sitio se ve funcionando, no congelado
- [ ] **El pago con Webpay se muestra funcionando** (bloque 1)
- [ ] **Nadie dice que el pool de conexiones es el cuello de botella confirmado**
- [ ] **Nadie presenta el conteo de la paginación como una mejora pendiente** (está refutada)
- [ ] Subido a YouTube **como no listado** o a Drive con permiso de lectura
- [ ] Probaron el enlace en una ventana de incógnito

---

## Si algo falla mientras grabas

| Problema | Qué hacer |
|---|---|
| El sitio no carga | Está suspendido. Espera 50 segundos, o usa capturas |
| Un producto sale agotado | Normal, 12 % nace sin stock. Elige otro |
| La pasarela de Webpay falla | Muestra la sección 8.5 del informe y di que está verificada de extremo a extremo |
| GA4 no muestra datos | Di que demora en consolidar y muestra *Tiempo real* |
| Te equivocas al hablar | Para, respira, repite ese bloque. Se edita después |
| Tu bloque se pasa de 2 minutos | Recorta la parte técnica, nunca la frase de enlace ni el cierre |

**Consejo:** antes de la grabación final, cada uno hace una pasada de su bloque sin grabar,
cronometrando. Dos minutos son menos de lo que parecen.
