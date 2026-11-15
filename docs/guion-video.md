# Guion del video — para Catalina

Guion completo para **una sola presentadora**. Cada bloque dice qué tienes en pantalla y qué
decir encima. El texto en cursiva se puede leer casi literal.

**Duración objetivo:** 11 minutos
**Sitio:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada

---

## ⚠️ Importante antes de empezar

El enunciado exige que **participen todos los integrantes**. Si grabas sola, el video no
cumple ese requisito.

**Solución mínima:** pide a cada integrante que grabe **15 segundos** con su celular
diciendo su nombre y qué parte le tocó. Son cinco clips cortos que se pegan al inicio. Con
eso el requisito se cumple y tú presentas el resto.

**Guion para esos 15 segundos de cada uno:**

> *"Hola, soy [nombre]. En este trabajo me encargué de [parte]."*

Reparto sugerido para que cada uno diga algo distinto:

| Integrante | Qué dice que hizo |
|---|---|
| Gabriel Araya | la arquitectura y el modelo de datos |
| Bianca Torres | la integración con Google Analytics |
| Lucas Mora | los generadores de carga y las mediciones |
| Matías Torres | el análisis de resultados |
| Catalina Araniz | la documentación y esta presentación |

---

## Preparación técnica (15 minutos antes)

1. **Abre el sitio y déjalo cargado.** Render lo suspende tras 15 minutos sin uso y tarda
   hasta 50 segundos en despertar. Si lo abres recién al grabar, se ve congelado.
   ```
   https://pisada.onrender.com/catalogo
   ```

2. **Deja estas 4 pestañas abiertas, en este orden:**
   - Pestaña 1: el sitio
   - Pestaña 2: `github.com/lmoral-sketch/pisada`
   - Pestaña 3: `github.com/lmoral-sketch/pisada/blob/master/docs/informe-fase1.md`
   - Pestaña 4: el panel de GA4

3. **OBS Studio:**
   - Fuentes → **+** → *Captura de pantalla* (toda la pantalla)
   - Fuentes → **+** → *Dispositivo de captura de video* (tu cámara)
   - Arrastra la cámara a la esquina inferior derecha y achícala a un cuarto
   - Botón **Iniciar grabación**

4. Prueba el audio grabando 10 segundos y escuchándolos.

> **Puedes grabar por partes.** Si te equivocas, para, respira y vuelve a grabar ese bloque.
> Después se unen con Clipchamp (viene en Windows).

---

# BLOQUE 1 — Presentación (0:00 – 1:00)

**Pantalla:** portada de tu presentación con el logo UTEM.

> *"Hola, somos el grupo de Desempeño de Sistemas, INFB8091. Yo soy Catalina Araniz y voy a
> presentar nuestro trabajo semestral.*
>
> *Construimos Pisada, una tienda de zapatillas e indumentaria urbana. Pero quiero partir
> aclarando algo importante: la tienda no es el objetivo del trabajo. Es el sujeto de
> estudio.*
>
> *Lo que hicimos fue medir cómo se degrada un sitio web cuando se le aplica carga, y explicar
> por qué se degrada usando la teoría del ramo: análisis operacional y teoría de colas.*
>
> *En los próximos minutos van a ver la arquitectura, el sitio funcionando, cómo generamos la
> carga, los resultados que obtuvimos, y al final —esto es lo que más nos importa— los errores
> de método que cometimos y cómo los detectamos."*

---

# BLOQUE 2 — Arquitectura (1:00 – 3:00)

**Pantalla:** pestaña 2, el diagrama del README en GitHub.

> *"La arquitectura es Next.js con PostgreSQL, empaquetado en Docker y desplegado en Render,
> con la base de datos en Neon.*
>
> *Hay tres decisiones que condicionaron todo el trabajo.*
>
> *La primera: usamos SQL directo, sin ORM. Un ORM genera las consultas por nosotros y las
> esconde. Como este trabajo analiza el costo de cada consulta, necesitábamos verlas.*
>
> *La segunda: desplegamos en contenedor y no en serverless. Un entorno serverless escala solo
> y no muestra la utilización de CPU y memoria, que es justo lo que la Fase 2 pide medir. Con
> serverless, nuestro sitio nunca se habría saturado de forma observable.*
>
> *Y la tercera, que es la central del trabajo."*

**Cambia a la pestaña 1 y abre una ficha de producto. Señala con el cursor la matriz de
tallas.**

> *"El inventario vive a nivel de SKU. Cada producto tiene variantes de talla y color, y cada
> combinación tiene su propio stock. 240 productos nos dan 4552 variantes.*
>
> *¿Por qué importa? Porque cuando alguien compra, hay que descontar stock de una fila
> concreta de la base de datos. Si veinte personas compran la misma talla del mismo modelo al
> mismo tiempo, tienen que hacer fila: la base de datos las atiende de a una.*
>
> *Esa fila es una cola de espera real y medible. Y es lo que nos permitió aplicar teoría de
> colas sobre datos nuestros, en vez de sobre ejercicios de pizarrón."*

---

# BLOQUE 3 — Demostración del sitio (3:00 – 5:00)

**Pantalla:** pestaña 1, navegando en vivo.

### Home

> *"Este es el sitio desplegado. El home es deliberadamente liviano: una sola consulta, 20
> milisegundos en el entorno local."*

### Catálogo — aplica un filtro de categoría, después uno de talla

> *"El catálogo es, también a propósito, la página pesada. Hace tres consultas y los filtros
> obligan a agregar sobre las 4552 variantes. Localmente cuesta 44 milisegundos, el doble que
> el home.*
>
> *Esa diferencia de peso entre páginas no es un descuido: es material experimental. Nos deja
> ver cómo se degradan de forma distinta bajo la misma carga."*

### Ficha de producto — señala las tallas tachadas

> *"Acá está la matriz de tallas. Fíjense que algunas aparecen tachadas: son combinaciones sin
> stock. Un 12 % del catálogo nace agotado, a propósito, porque genera puntos de abandono
> medibles en el embudo de conversión."*

### Elige una talla, agrega al carrito, ve al carrito, paga

> *"Agregamos una talla, vamos al carrito y pagamos.*
>
> *Acá tenemos que ser transparentes con algo. El enunciado pedía simular el pago con el
> sandbox de un medio de pago chileno. Nosotros implementamos el flujo completo de checkout
> pero sin integrar un sandbox externo.*
>
> *La razón es metodológica: una llamada a un servicio de terceros habría agregado un tiempo
> de respuesta que no controlamos, justo en el camino que el trabajo analiza. Preferimos
> declararlo antes que disimularlo."*

**Muestra la confirmación de compra.**

---

# BLOQUE 4 — Google Analytics 4 (5:00 – 6:00)

**Pantalla:** pestaña 4, el panel de GA4.

> *"Instrumentamos el sitio con Google Analytics 4. El profesor tiene acceso de Analista a
> esta propiedad.*
>
> *Acá están los cuatro eventos del embudo que pedía el enunciado: view_item cuando se ve una
> ficha, add_to_cart al agregar una talla, begin_checkout al pulsar pagar, y purchase cuando
> se confirma.*
>
> *Agregamos uno propio, compra_sin_stock, que no es estándar de GA4. Lo necesitábamos porque
> bajo carga el inventario se agota y las conversiones caen. Sin ese evento, en el informe se
> vería una caída de conversión sin causa aparente."*

**Si GA4 ya muestra los datos de las dos sesiones, muéstralos y di:**

> *"Comparamos la experiencia de usuario en condiciones normales contra la misma navegación
> mientras generábamos carga. El catálogo pasó de 394 milisegundos a 989: se degradó dos veces
> y media. El home, en cambio, casi no se movió. Eso confirma que las páginas pesadas se
> degradan antes, que es justo lo que diseñamos para poder observar."*

---

# BLOQUE 5 — Generadores de carga (6:00 – 7:30)

**Pantalla:** pestaña 2 → `carga/escenarios/comun.js`, baja hasta donde dice `CBMG`.

> *"Para generar la carga usamos k6, pero no con un guion fijo. Implementamos un Customer
> Behavior Model Graph, que es el modelo del material de cátedra.*
>
> *Los usuarios sintéticos transitan entre páginas con probabilidades. Por ejemplo, de los que
> ven un producto, solo el 12 % lo agrega al carrito; el 33 % vuelve al catálogo y el 35 % se
> va del sitio."*

**Señala el bloque `CBMG` en el código.**

> *"¿Por qué importa? Si todos los usuarios compraran, el 100 % llegaría al checkout, algo que
> no pasa en ningún comercio real donde la conversión ronda el 1 a 3 %. Estaríamos midiendo un
> sistema ficticio. Con el CBMG medimos una conversión del 6,8 %, que está en el orden
> correcto.*
>
> *Y encontramos una conexión teórica que nos pareció potente: las probabilidades del CBMG
> son, literalmente, las razones de visita de la ley del flujo forzado de la Unidad 2. El
> modelo de carga web y las leyes operacionales son el mismo modelo visto desde dos ángulos."*

**Cambia a la carpeta `carga/escenarios/`.**

> *"Corrimos cuatro escenarios: carga baja de 5 usuarios como línea base, carga sostenida de
> 25 durante diez minutos, un escenario de pico que sube por escalones hasta 350 usuarios, y
> uno extra de contención.*
>
> *Ese último no lo pedía el enunciado. Lo agregamos porque con 4552 variantes la probabilidad
> de que dos usuarios compren la misma combinación al mismo tiempo es ínfima, y toda la
> contención que queríamos estudiar quedaba invisible. Ese escenario hace que todos compitan
> por el mismo producto, como en un lanzamiento."*

---

# BLOQUE 6 — Resultados (7:30 – 9:30)

**Pantalla:** pestaña 2 → `docs/graficos/percentiles-escenarios.svg`

> *"Estos son los percentiles de los tres escenarios. Con 5 usuarios el percentil 95 es de 37
> milisegundos. Con 25 es prácticamente igual, 36. Y recién en el pico, con 350 usuarios, sube
> a 118. La tasa de error se mantuvo en 0,01 %: el sistema nunca colapsó."*

**Abre `docs/graficos/utilizacion-cpu.svg`**

> *"Acá está la curva de utilización de CPU. Crece casi lineal, de 9 % con 25 usuarios a 76 %
> con 350."*

**Abre `docs/graficos/cpu-por-usuario.svg`**

> *"Pero este gráfico es el interesante. Es la CPU consumida por usuario, y decrece: de 0,368
> a 0,217 por ciento.*
>
> *Significa que cada usuario consume menos CPU por unidad de tiempo, porque pasa
> proporcionalmente más rato esperando que siendo atendido. Esa es la firma del encolamiento,
> y aparece antes de que la lentitud se note en el tiempo de respuesta. Es un indicador
> temprano."*

**Cambia a pestaña 3, sección 5.3 del informe.**

> *"Verificamos dos leyes del ramo con datos propios.*
>
> *La ley de utilización, U igual a X por S, nos cerró exacta: 35,1 %, con un tiempo de
> servicio de 11,27 milisegundos de CPU por petición.*
>
> *Y la ley de Little nos permitió estimar cuántas transacciones estaban en promedio haciendo
> cola por el bloqueo de stock, que es un número que no se puede observar directamente."*

**Abre `docs/graficos/techo-amdahl.svg`**

> *"Esto es la ley de Amdahl, pero calculada con nuestros datos, no citada.*
>
> *El 7,2 % del tiempo del checkout es espera serializada sobre el bloqueo de stock. Esa
> fracción no se paraleliza, así que por mucha CPU que le agreguemos, el checkout no puede
> mejorar más de 13,9 veces.*
>
> *Y bajo contención alta esa fracción sube, y el techo se desploma a menos de 5 veces.
> Significa que escalar por hardware tiene un límite calculable, y que para bajarlo hay que
> cambiar el diseño, no comprar más máquina."*

---

# BLOQUE 7 — Cuellos de botella y mejoras (9:30 – 10:30)

**Pantalla:** pestaña 3, sección 6 del informe.

> *"El cuello de botella no resultó ser el que esperábamos. No es la CPU ni la base de datos:
> es el pool de conexiones. Y llega ahí por contagio.*
>
> *Lo que pasa es esto: las transacciones que esperan el bloqueo de un producto retienen su
> conexión mientras esperan. El pool de diez conexiones se agota. Y entonces todo el sitio se
> vuelve lento, incluidas páginas de catálogo que no tienen nada que ver con ese producto.*
>
> *Un recurso serializado le contagia su saturación a un recurso compartido. Eso explica por
> qué la mediana se mantiene sana en 13 milisegundos mientras el percentil 95 se va a
> segundos: la mayoría de las peticiones pasa bien, y una cola larga queda atrapada.*
>
> *Encontramos además una tercera cola: el event loop de Node, que procesa en un solo hilo.
> Con una CPU asignada, ese hilo no puede escalar. El sistema tiene tres puntos de
> serialización encadenados."*

**Baja a la sección 7.**

> *"De ahí salen nuestras propuestas, cada una con la evidencia que la respalda.*
>
> *La primera es la más barata: eliminar el conteo exacto de la paginación. Medimos que cuesta
> 4,55 milisegundos, un 54 % de lo que cuesta el listado completo, sin devolver una sola fila
> de datos.*
>
> *La segunda: no retener la conexión mientras se espera el bloqueo.*
>
> *Y la tercera: repartir el inventario de los productos populares en varias filas, que es la
> técnica de los contadores distribuidos."*

---

# BLOQUE 8 — Honestidad metodológica y cierre (10:30 – 11:30)

**Pantalla:** pestaña 3, sección 8 del informe.

> *"Quiero terminar con algo que normalmente no se muestra: los errores que cometimos.*
>
> *Uno. Nuestro generador de carga tenía un defecto y no ejercitaba el checkout. Descartaba
> todos los botones de talla por un problema con las clases de CSS. Lo grave es que esa corrida
> habría reportado tiempos excelentes y cero errores. Un generador con un defecto silencioso
> no falla: miente.*
>
> *Dos. En un experimento se nos agotó el inventario a mitad de la corrida, y la segunda mitad
> midió rechazos rápidos en vez de compras. El resultado decía que la contención mejoraba el
> desempeño.*
>
> *Tres. Nuestro propio instrumento medía intervalos distintos en cada estrategia, así que la
> comparación estaba sesgada por construcción.*
>
> *Y cuatro, el más importante. Al repetir el experimento de contención, el percentil 95 varió
> dos órdenes de magnitud entre corridas idénticas, y el orden entre las dos estrategias se
> invirtió.*
>
> *Así que nuestra conclusión en ese punto es que, con la evidencia disponible, no podemos
> afirmar cuál estrategia de concurrencia es mejor. Preferimos decirlo antes que elegir la
> corrida que nos convenía.*
>
> *Eso es todo. Muchas gracias."*

---

## Checklist antes de subir

- [ ] Los 5 integrantes aparecen (aunque sea 15 segundos cada uno al inicio)
- [ ] Estás visible, de frente a la cámara, en una ventana
- [ ] La presentación se ve de fondo
- [ ] Logo y colores UTEM aplicados
- [ ] Entre 10 y 12 minutos
- [ ] El audio se entiende
- [ ] El sitio se ve funcionando, no congelado
- [ ] Subido a YouTube **como no listado** o a Drive con permiso de lectura
- [ ] Probaste el enlace en una ventana de incógnito

---

## Si algo falla mientras grabas

| Problema | Qué hacer |
|---|---|
| El sitio no carga | Está suspendido. Espera 50 segundos, o usa capturas |
| Un producto sale agotado | Normal, 12 % nace sin stock. Elige otro |
| GA4 no muestra datos | Di que demora en consolidar y muestra Tiempo real |
| Te equivocas al hablar | Para, respira, repite ese bloque. Se edita después |

**Consejo:** antes de la grabación final, haz una pasada completa sin grabar, cronometrando.
Así sabes si te alcanzan los 11 minutos.
