# Guion del video — qué mostrar y qué decir

Guion operativo. Cada bloque indica **qué se ve en pantalla** y **qué se dice encima**.
El texto en cursiva se puede leer casi literal.

**Duración objetivo:** 11 minutos
**Sitio:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada

---

## Reparto de bloques

El enunciado exige que **participen todos los integrantes**. Con cinco personas, cada una
toma uno o dos bloques. Se puede grabar por separado y unir después.

| Bloque | Minutos | Tema | Presenta |
|---|---|---|---|
| 1 | 0:00 – 1:00 | Presentación del equipo y del trabajo | **Catalina Araniz** |
| 2 | 1:00 – 3:00 | Arquitectura y decisiones de diseño | **Gabriel Araya** |
| 3 | 3:00 – 5:00 | Demostración del sitio | **Bianca Torres** |
| 4 | 5:00 – 6:00 | Google Analytics 4 | **Bianca Torres** |
| 5 | 6:00 – 7:30 | Generadores de carga y modelo CBMG | **Matías Torres** |
| 6 | 7:30 – 9:30 | Resultados y leyes verificadas | **Lucas Mora** |
| 7 | 9:30 – 10:30 | Cuellos de botella y propuestas | **Matías Torres** |
| 8 | 10:30 – 11:30 | Errores metodológicos y cierre | **Catalina Araniz** + todos |

**Tiempo por persona:** Catalina 2 min · Gabriel 2 min · Bianca 3 min · Matías 3,5 min ·
Lucas 2 min.

> Si alguien prefiere otro bloque, se puede cambiar: lo único obligatorio es que **todos
> aparezcan**. Si alguien no puede grabar, que al menos aparezca en el bloque 1 presentándose
> y en el cierre.

---

## Antes de grabar

### Requisitos del enunciado, no negociables

- Participan **todos** los integrantes
- Quien presenta está **visible, de frente a la cámara, en una ventana**
- La **presentación va de fondo**
- Se puede grabar por partes y unir después

### Preparación técnica

1. **Abrir el sitio 5 minutos antes.** Render lo suspende tras 15 minutos de inactividad y
   tarda hasta 50 segundos en despertar. Si lo abres recién al grabar, se ve congelado.

   ```
   https://pisada.onrender.com/catalogo
   ```

2. Tener abiertas estas pestañas, en este orden:
   - El sitio
   - El panel de GA4
   - El repositorio en GitHub
   - `docs/informe-fase1.md` (en GitHub se ve formateado)

3. **OBS Studio:** Fuentes → + → *Captura de pantalla*; luego + → *Dispositivo de captura de
   video* para la cámara. Arrastrar la cámara a una esquina y achicarla.

4. Resolución 1920×1080, audio probado.

---

# BLOQUE 1 — Presentación (0:00 – 1:00)

**En pantalla:** portada de la presentación con el logo UTEM, el nombre del ramo y los
integrantes.

**Quién habla:** Catalina Araniz.

> *"Buenas, somos Catalina Araniz, Gabriel Araya, Bianca Torres, Lucas Mora y Matías Torres. Este es el trabajo semestral de Desempeño de Sistemas,
> INFB8091.*
>
> *Construimos Pisada, una tienda de zapatillas e indumentaria urbana. Pero quiero partir
> aclarando algo: la tienda no es el objetivo del trabajo, es el sujeto de estudio. Lo que
> hicimos fue medir cómo se degrada un sitio web cuando se le aplica carga, y explicar por
> qué se degrada usando la teoría del ramo.*
>
> *En los próximos minutos vamos a mostrar la arquitectura, el sitio funcionando, cómo
> generamos la carga, los resultados, y —esto es importante— también los errores de método
> que cometimos y cómo los detectamos."*

---

# BLOQUE 2 — Arquitectura (1:00 – 3:00)

**En pantalla:** el diagrama del `README.md` en GitHub.

**Quién habla:** Gabriel Araya.

> *"La arquitectura es Next.js con PostgreSQL, empaquetado en Docker y desplegado en Render,
> con la base de datos en Neon.*
>
> *Hay tres decisiones que condicionaron todo el trabajo y quiero explicar por qué las
> tomamos.*
>
> **Primera: usamos SQL directo, sin ORM.** *Un ORM genera las consultas por nosotros y las
> esconde. Como este trabajo analiza el costo de cada consulta, necesitábamos verlas.*
>
> **Segunda: desplegamos en contenedor y no en serverless.** *Un entorno serverless escala
> solo de forma transparente y no expone la utilización de CPU y memoria. La Fase 2 pide
> medir justamente eso. Con serverless, el sitio nunca se habría saturado de forma
> observable.*
>
> **Tercera, y es la central:** *el inventario vive a nivel de SKU.*"

**Cambiar a:** la ficha de un producto en el sitio, mostrando la matriz de tallas.

> *"Cada producto tiene variantes de talla y color, y cada combinación tiene su propio stock.
> 240 productos nos dan 4552 variantes.*
>
> *¿Por qué importa? Porque cuando alguien compra, hay que descontar stock de una fila
> concreta de la base de datos. Si veinte personas compran la misma talla del mismo modelo al
> mismo tiempo, tienen que hacer fila: la base las atiende de a una.*
>
> *Esa fila es una cola de espera real, medible. Y es lo que nos permitió aplicar teoría de
> colas y análisis operacional sobre datos nuestros, en vez de sobre ejercicios de pizarrón."*

---

# BLOQUE 3 — Demostración del sitio (3:00 – 5:00)

**En pantalla:** navegación en vivo por https://pisada.onrender.com

**Quién habla:** Bianca Torres.

### 3.1 Home

> *"Este es el sitio desplegado. El home es deliberadamente liviano: una consulta, 20
> milisegundos en el entorno local."*

### 3.2 Catálogo — aplicar un filtro de categoría y otro de talla

> *"El catálogo es, también a propósito, la página pesada. Ejecuta tres consultas y los
> filtros obligan a agregar sobre las 4552 variantes. Localmente cuesta 44 milisegundos, el
> doble que el home.*
>
> *Esa diferencia de peso entre páginas no es un descuido: es material experimental. Nos
> permite ver cómo se degradan de forma distinta bajo la misma carga."*

### 3.3 Ficha de producto — señalar con el cursor las tallas tachadas

> *"Acá se ve la matriz de tallas. Fíjense que algunas aparecen tachadas y deshabilitadas:
> son combinaciones sin stock. Un 12 % del catálogo nace agotado, a propósito, porque genera
> puntos de abandono medibles en el embudo."*

### 3.4 Agregar al carrito, ir al carrito, pagar

> *"Agregamos una talla, vamos al carrito y pagamos.*
>
> *Acá tenemos que ser transparentes con una cosa: el enunciado pedía simular el pago con el
> sandbox de un medio de pago chileno. Nosotros implementamos el flujo completo de checkout
> pero sin integrar un sandbox externo. La razón es metodológica: una llamada a un servicio de
> terceros habría agregado un tiempo de respuesta que no controlamos, justo en el camino que
> el trabajo analiza. Preferimos declararlo antes que disimularlo."*

**Mostrar la confirmación de compra.**

---

# BLOQUE 4 — Google Analytics 4 (5:00 – 6:00)

**En pantalla:** panel de GA4, propiedad Pisada.

**Quién habla:** Bianca Torres.

> *"Instrumentamos el sitio con Google Analytics 4 usando gtag.js. El profesor tiene acceso
> de Analista a esta propiedad.*
>
> *Acá están los cuatro eventos del embudo que pedía el enunciado: view_item cuando se ve una
> ficha, add_to_cart al agregar una talla, begin_checkout al pulsar pagar, y purchase al
> confirmarse.*
>
> *Agregamos uno propio, compra_sin_stock, que no es estándar de GA4. Lo necesitábamos porque
> bajo carga el inventario se agota y las conversiones caen. Sin este evento, en el informe se
> vería una caída de conversión sin causa aparente."*

**Si alcanzaron a hacer el protocolo de dos sesiones, mostrar la comparación acá y decir:**

> *"Acá comparamos la experiencia de usuario en condiciones normales contra la misma
> navegación mientras k6 cargaba el servidor."*

**Si no alcanzaron, decirlo honestamente:**

> *"Esta comparación quedó pendiente. La razón es técnica y vale la pena explicarla: k6 es un
> cliente HTTP, no ejecuta JavaScript, así que su tráfico no genera eventos en GA4. Para
> comparar la experiencia bajo carga se necesita que personas reales naveguen mientras k6
> carga el servidor. Lo dejamos documentado como protocolo en el repositorio."*

---

# BLOQUE 5 — Generadores de carga (6:00 – 7:30)

**En pantalla:** `carga/escenarios/comun.js` en GitHub, en la sección del CBMG.

**Quién habla:** Matías Torres.

> *"Para generar la carga usamos k6, pero no con un guion fijo. Implementamos un Customer
> Behavior Model Graph, el modelo del material de cátedra.*
>
> *Los usuarios sintéticos transitan entre páginas con probabilidades. Por ejemplo, de los que
> ven un producto, solo el 12 % lo agrega al carrito; el 33 % vuelve al catálogo y el 35 % se
> va del sitio."*

**Señalar el bloque `CBMG` en el código.**

> *"¿Por qué importa? Si todos los usuarios compraran, el 100 % llegaría al checkout, algo que
> no pasa en ningún comercio real donde la conversión ronda el 1 a 3 %. Estaríamos midiendo un
> sistema ficticio. Con el CBMG medimos una conversión del 6,8 %, que está en el orden
> correcto.*
>
> *Y hay una conexión teórica que nos pareció potente: las probabilidades del CBMG son,
> literalmente, las razones de visita de la ley del flujo forzado de la Unidad 2. El modelo de
> carga web y las leyes operacionales son el mismo modelo visto desde dos ángulos."*

**Cambiar a:** la carpeta `carga/escenarios/`.

> *"Corrimos cuatro escenarios: carga baja de 5 usuarios como línea base, carga sostenida de
> 25 durante diez minutos, un escenario de pico que sube por escalones hasta 350, y uno extra
> de contención.*
>
> *Ese último no lo pedía el enunciado. Lo agregamos porque con 4552 variantes la probabilidad
> de que dos usuarios compren la misma combinación al mismo tiempo es ínfima, y toda la
> contención que queríamos estudiar quedaba invisible. Ese escenario hace que todos compitan
> por el mismo SKU, como en un lanzamiento."*

---

# BLOQUE 6 — Resultados (7:30 – 9:30)

**En pantalla:** `docs/graficos/percentiles-escenarios.svg`

**Quién habla:** Lucas Mora.

> *"Estos son los percentiles de los tres escenarios. Con 5 usuarios el p95 es de 37
> milisegundos; con 25 es prácticamente igual, 36; y recién en el pico con 350 usuarios sube a
> 118. La tasa de error se mantuvo en 0,01 %: el sistema nunca colapsó."*

**Cambiar a:** `docs/graficos/utilizacion-cpu.svg`

> *"Acá está la curva de utilización de CPU. Crece casi lineal, de 9 % con 25 usuarios a 76 %
> con 350."*

**Cambiar a:** `docs/graficos/cpu-por-usuario.svg`

> *"Pero este gráfico es el interesante. Es la CPU consumida por usuario, y decrece: de 0,368
> a 0,217 por ciento.*
>
> *Significa que cada usuario consume menos CPU por unidad de tiempo, porque pasa
> proporcionalmente más rato esperando que siendo atendido. Esa es la firma del encolamiento,
> y aparece antes de que la lentitud se note en el tiempo de respuesta. Es un indicador
> temprano."*

**Cambiar a:** la sección 5.3 del informe.

> *"Verificamos dos leyes del ramo con datos propios.*
>
> *La ley de utilización, U igual a X por S, cerró exacta: 35,1 %, con un tiempo de servicio
> de 11,27 milisegundos de CPU por petición.*
>
> *Y la ley de Little nos permitió estimar cuántas transacciones estaban en promedio haciendo
> cola por el bloqueo de stock, que es un número que no se puede observar directamente."*

**Cambiar a:** `docs/graficos/techo-amdahl.svg`

> *"Esto es la ley de Amdahl, pero calculada, no citada.*
>
> *El 7,2 % del tiempo del checkout es espera serializada sobre el bloqueo de stock. Esa
> fracción no se paraleliza, así que por mucha CPU que le agreguemos, el checkout no puede
> mejorar más de 13,9 veces.*
>
> *Y bajo contención alta esa fracción sube y el techo se desploma a menos de 5 veces.
> Significa que escalar por hardware tiene un límite calculable, y que reducirlo exige cambiar
> el diseño, no comprar más máquina."*

---

# BLOQUE 7 — Cuellos de botella y mejoras (9:30 – 10:30)

**En pantalla:** sección 6 del informe.

**Quién habla:** Matías Torres.

> *"El cuello de botella no resultó ser el que esperábamos. No es la CPU ni la base de datos:
> es el pool de conexiones. Y llega ahí por contagio.*
>
> *Lo que pasa es esto: las transacciones que esperan el bloqueo de un SKU retienen su
> conexión mientras esperan. El pool de diez se agota. Y entonces todo el sitio se vuelve
> lento, incluidas las páginas de catálogo que no tienen nada que ver con ese producto.*
>
> *Un recurso serializado le contagia su saturación a un recurso compartido. Eso explica por
> qué la mediana se mantiene sana en 13 milisegundos mientras el p95 se va a segundos: la
> mayoría pasa bien y una cola larga queda atrapada."*

**Cambiar a:** sección 7 del informe.

> *"De ahí salen nuestras propuestas, cada una con la evidencia que la respalda.*
>
> *La primera es la más barata: eliminar el COUNT exacto de la paginación. Medimos que cuesta
> 4,55 milisegundos, un 54 % de lo que cuesta el listado completo, sin devolver una sola fila
> de datos.*
>
> *La segunda: no retener la conexión mientras se espera el bloqueo, por lo que acabamos de
> explicar.*
>
> *Y la tercera: repartir el inventario de los productos populares en varias filas, que es la
> técnica de los contadores distribuidos."*

---

# BLOQUE 8 — Honestidad metodológica y cierre (10:30 – 11:30)

**En pantalla:** sección 8 del informe, *Limitaciones y errores metodológicos detectados*.

**Quién habla:** Catalina Araniz, con los demás en pantalla si es posible.

> *"Queremos terminar con algo que normalmente no se muestra: los errores que cometimos.*
>
> **Uno.** *Nuestro generador de carga tenía un defecto y no ejercitaba el checkout. Descartaba
> todos los botones de talla por un problema con las clases de CSS. Lo grave es que esa corrida
> habría reportado tiempos excelentes y cero errores. Un generador con un defecto silencioso no
> falla: miente.*
>
> **Dos.** *En un experimento se nos agotó el inventario a mitad de corrida, y la segunda mitad
> midió rechazos rápidos en vez de compras. El resultado decía que la contención mejoraba el
> desempeño.*
>
> **Tres.** *Nuestro propio instrumento medía intervalos distintos en cada estrategia, así que
> la comparación estaba sesgada por construcción.*
>
> **Y cuatro, el más importante.** *Al repetir el experimento de contención, el p95 varió dos
> órdenes de magnitud entre corridas idénticas, y el orden entre las dos estrategias se
> invirtió.*
>
> *Así que nuestra conclusión en ese punto es que con la evidencia disponible no podemos
> afirmar cuál estrategia de concurrencia es mejor. Preferimos decirlo antes que elegir la
> corrida que nos convenía.*
>
> *Eso es todo. Gracias."*

---

## Lista de verificación antes de subir

- [ ] Aparecen todos los integrantes
- [ ] Cada presentador visible, de frente, en una ventana
- [ ] La presentación se ve de fondo
- [ ] Identidad visual UTEM aplicada
- [ ] Entre 10 y 12 minutos
- [ ] El audio se entiende en todos los fragmentos
- [ ] El sitio se ve funcionando, no congelado
- [ ] Subido a YouTube como no listado, o a Drive con permiso de lectura
- [ ] El enlace abre desde una ventana de incógnito

---

## Si algo falla en vivo

| Problema | Qué hacer |
|---|---|
| El sitio no carga | Está suspendido. Esperar 50 s o usar capturas previas |
| Un producto aparece agotado | Normal, 12 % del catálogo nace sin stock. Elegir otro |
| GA4 no muestra datos recientes | Explicar que demora en consolidar; mostrar Tiempo real |

**Recomendación:** grabar una pasada de respaldo del sitio **antes** de la sesión final, por
si durante la grabación algo no responde.
