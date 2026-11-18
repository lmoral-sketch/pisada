# Hoja de sincronizacion

| Entrada | Salida | Frase del guion | Accion o evidencia visible |
|---|---|---|---|
| 0:00 | 0:10 | Hola, somos el grupo de Desempeno de Sistemas, INFB8091 | Portada Pisada / UTEM |
| 0:10 | 0:15 | la tienda no es el objetivo del trabajo, es el sujeto de estudio | Lamina del planteamiento |
| 0:15 | 0:21 | Este es el sitio desplegado en Render | Home de Pisada |
| 0:21 | 0:28 | El catalogo es, tambien a proposito, la pagina pesada | Catalogo completo |
| 0:28 | 0:35 | los filtros obligan a agregar sobre las 4552 variantes | Filtro Zapatillas urbanas |
| 0:35 | 0:41 | Cuesta 44 milisegundos, el doble que el home | Filtro de talla 40 |
| 0:41 | 0:48 | Aca esta la matriz de tallas | Ficha Ruta 7 Oasis Pro |
| 0:48 | 0:54 | Algunas aparecen tachadas: son combinaciones sin stock | Talla 40 / Azul noche seleccionada |
| 0:54 | 0:58 | Agregamos una talla | Producto agregado al carrito |
| 0:58 | 1:05 | y vamos al carrito | Carrito con PSD-2-5-4 |
| 1:05 | 1:11 | Esto es el flujo real | Pedido confirmado, checkout propio |
| 1:11 | 1:24 | registro e inicio de sesion | Pantalla Mi cuenta |
| 1:24 | 1:30 | el enunciado pedia simular el checkout con el sandbox | Carrito con Pagar con Webpay |
| 1:30 | 1:36 | integramos Transbank Webpay Plus | Webpay: seleccion de medio de pago |
| 1:36 | 1:41 | en su ambiente de integracion | Webpay: formulario de tarjeta |
| 1:41 | 1:47 | pago con tarjeta de prueba | Tarjeta de prueba ingresada |
| 1:47 | 1:51 | autenticacion | Banco simulado |
| 1:51 | 1:54 | y vuelve a nuestro sitio | Autorizacion del banco |
| 1:54 | 2:00 | con el pedido creado | Pago confirmado, 289 ms de Transbank |
| 2:00 | 2:25 | La arquitectura es Next.js con PostgreSQL 16 | Diagrama del README |
| 2:25 | 2:50 | Hay tres decisiones que condicionaron todo el trabajo | Lamina de las tres decisiones |
| 2:50 | 3:10 | El inventario vive a nivel de SKU | Matriz de tallas |
| 3:10 | 3:35 | la base las atiende de a una | SELECT FOR UPDATE en checkout.ts |
| 3:35 | 3:50 | el sistema tiene tres puntos de serializacion encadenados | Lamina: tres colas encadenadas |
| 3:50 | 4:00 | medimos 222 peticiones esperando | Tabla de espera del pool |
| 4:00 | 4:20 | Instrumentamos el sitio con Google Analytics 4 | Flujo de datos, G-P8EWE6D7G3 |
| 4:20 | 4:35 | El profesor tiene acceso de Analista | Gestion de accesos |
| 4:35 | 5:20 | Aca estan los cuatro eventos del embudo | Tabla de eventos de GA4 |
| 5:20 | 5:40 | Y agregamos uno propio, compra_sin_stock | Evento propio en Tiempo real |
| 5:40 | 6:00 | El catalogo paso de 394 milisegundos a 989 | Tabla de degradacion por pagina |
| 6:00 | 6:15 | Implementamos un Customer Behavior Model Graph | Lamina del CBMG |
| 6:15 | 7:00 | solo el 12 % lo agrega al carrito | Bloque CBMG en comun.js |
| 7:00 | 7:20 | Corrimos cuatro escenarios | Lamina de los escenarios |
| 7:20 | 7:40 | un escenario de pico que sube por escalones hasta 350 | pico.js |
| 7:40 | 8:00 | Ese escenario fuerza a todos a competir por el mismo producto | contencion.js |
| 8:00 | 8:18 | Estos son los percentiles de los tres escenarios | Grafico de percentiles |
| 8:18 | 8:32 | Aca esta la curva de utilizacion de CPU | Utilizacion de CPU |
| 8:32 | 8:56 | Pero este es el grafico interesante | CPU por usuario |
| 8:56 | 9:14 | La ley de utilizacion nos cerro exacta | Verificacion de las leyes |
| 9:14 | 9:32 | el checkout no puede mejorar mas de 13,9 veces | Techo de Amdahl |
| 9:32 | 9:46 | quiero mostrar las dos que refutamos nosotros mismos | Lamina de propuestas |
| 9:46 | 10:00 | los rangos se solapan por completo | Tabla de repeticiones del pool |
| 10:00 | 10:24 | los cinco errores de metodo que cometimos nosotros | Lamina de los cinco errores |
| 10:24 | 10:48 | un generador con un defecto silencioso no falla: miente | Generador de carga |
| 10:48 | 11:12 | se nos agoto el inventario a mitad de la corrida | Escenario de contencion |
| 11:12 | 11:36 | nuestro propio instrumento media intervalos distintos | Instrumentacion del checkout |
| 11:36 | 11:54 | Repetimos el experimento y se cayo | Repeticiones del pool |
| 11:54 | 12:00 | Somos Catalina, Gabriel, Bianca, Lucas y Matias. Muchas gracias | Lamina de cierre |
