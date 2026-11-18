# Video de fondo para la defensa

**`Pisada_fondo_12min.mp4`** — 1920×1080, 30 fps, 12:00 exactos, **sin pista de audio**.

Es el fondo visual sobre el que el equipo graba sus voces y cámaras. No lleva avatares,
rostros, recuadros de cámara ni subtítulos: solo las pantallas.

## Cómo usarlo

1. Cada integrante abre el MP4 y busca su bloque en `hoja-sincronizacion.md`.
2. Reproduce el video y graba su voz y cámara encima, siguiendo lo que aparece en pantalla.
3. Se monta todo en Clipchamp: el MP4 abajo, las cámaras encima en una esquina.

Los tiempos de los seis bloques coinciden con `docs/guion-video.md`:

| Bloque | Entra | Presenta |
|---|---|---|
| 1 | 0:00 | Catalina Araniz |
| 2 | 2:00 | Gabriel Araya |
| 3 | 4:00 | Bianca Torres |
| 4 | 6:00 | Matías Torres |
| 5 | 8:00 | Lucas Mora |
| 6 | 10:00 | Los cinco, un error cada uno |

## Qué se ve, y de dónde salió

Todo es material propio y auténtico: no hay ninguna pantalla reconstruida.

| Fuente | Qué aporta |
|---|---|
| La aplicación corriendo | Home, catálogo con filtros, ficha, carrito, confirmación, Mi cuenta |
| Transbank, ambiente de integración | El recorrido de Webpay Plus completo, con tarjeta de prueba |
| GitHub | `README.md`, `checkout.ts`, los escenarios de k6 y las tablas del informe |
| `docs/assets/ga4/` | Las cuatro capturas del panel de GA4 |
| `docs/graficos/` | Los cinco gráficos del informe |
| `docs/presentacion.html` | Las once láminas |

**El pago de Webpay es real** dentro del ambiente de integración: pedido N.º 43, código de
autorización 1213, tarjeta terminada en 6623, 289 ms de respuesta de Transbank. No se mueve
dinero real y las tarjetas son las que Transbank publica para pruebas.

## Cómo se generó

Capturas a 1920×1080 nativos con Chrome headless conducido por `puppeteer-core`, y montaje
con `ffmpeg`. Los guiones de captura quedaron fuera del repositorio porque son de un solo uso;
el procedimiento está descrito en `logs/prompts.md`.

## Limitación declarada

Cada plano es una **captura fija** sostenida el tiempo que marca el guion, no una grabación
continua con el cursor moviéndose. La secuencia es real y está en orden, pero las
transiciones son cortes, no movimiento. Si el equipo alcanza a grabar el recorrido de compra
en continuo, esos 56 segundos (00:15–01:11) se pueden reemplazar conservando las señales de
tiempo de la hoja de sincronización.
