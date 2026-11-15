# Auditoría de cumplimiento del enunciado

Revisión punto por punto del enunciado *Trabajo Semestre 2 - 2026* contra el estado real del
proyecto.

**Fecha de la auditoría:** 15 de noviembre de 2026
**Entrega:** lunes 16 de noviembre

**Leyenda:** ✅ cumplido · ⚠️ parcial · ❌ falta · 👤 depende del equipo

---

## Resumen

| Bloque | Cumplimiento |
|---|---|
| Fase 1.1 — Sitio funcional | **8 de 9** |
| Fase 1.2 — Generadores de carga | **3 de 3** |
| Fase 2 — Análisis de desempeño | **6 de 9** |
| Entregables | **4 de 7** |
| Requisitos del agente de IA | **7 de 8** |

**Brechas que impiden entregar:** 2 (video, identidad visual) — *integrantes resuelto*
**Brechas que bajan la nota:** 3 (sandbox de pago, datos de GA4, formulario de prompts)

---

## Fase 1.1 — Sitio funcional mínimo

| Requisito | Estado | Evidencia |
|---|---|---|
| Catálogo con filtros/búsqueda | ✅ | 240 productos, filtros por categoría, marca, género, talla, color y búsqueda por nombre |
| Carrito de compras | ✅ | `web/src/lib/carrito.ts`, opera sobre variantes |
| Flujo de checkout | ⚠️ | **Ver brecha B-01** |
| Registro/login de usuario | ✅ | `scrypt`, tabla `sesion`, verificado de extremo a extremo |
| 2-3 páginas con distinta carga | ✅ | home 20 ms, detalle 20 ms, catálogo 44 ms |
| GA4 vía `gtag.js` | ✅ | `G-P8EWE6D7G3`, verificado en producción |
| Eventos `add_to_cart`, `begin_checkout`, `purchase`, `view_item` | ✅ | `web/src/lib/ga.ts`, más el evento propio `compra_sin_stock` |
| Métricas de engagement | ⚠️ | Medición mejorada activada; **faltan los datos recolectados** (B-03) |
| Acceso a `j.aranda@utem.cl` | ✅ | Rol Analista otorgado |

### 🔴 B-01 — El checkout no usa un sandbox de medio de pago

**Lo que pide el enunciado, textual:**

> *"Flujo de checkout (simulado con sandbox de algún medio de pago disponible en Chile, sin
> pasarela de pago real)."*

**Lo que hay:** un checkout completamente propio. Descuenta inventario, crea el pedido y
genera una referencia `SIM-<timestamp>-<aleatorio>`. **No se integró ningún sandbox** (Webpay
Plus, Flow, Khipu u otro).

**Impacto:** incumplimiento parcial de un requisito explícito.

**Atenuante defendible:** el enunciado pide el sandbox para *simular* el pago sin procesar
dinero real, y eso se cumple — no hay cobro ni datos de tarjeta. Además, para el objetivo del
trabajo, integrar un sandbox externo **habría empeorado las mediciones**: agregaría una
llamada de red a un tercero cuyo tiempo de respuesta no controlamos, contaminando el análisis
del checkout, que es justamente el camino que el trabajo estudia.

**Recomendación:** declararlo de forma explícita en el informe y en el video, con esa
justificación, en vez de esperar que no se note. Si hubiera tiempo, integrar el **ambiente de
integración de Transbank Webpay Plus** cerraría la brecha; no alcanza para mañana.

---

## Fase 1.2 — Generadores de carga

| Requisito | Estado | Evidencia |
|---|---|---|
| Simular usuarios concurrentes con comportamientos distintos | ✅ | Modelo CBMG con probabilidades de transición |
| Parametrizar: usuarios, ramp-up, duración, tasa | ✅ | `carga/escenarios/`, todos los escenarios parametrizados |
| Al menos 3 escenarios: baja, sostenida, pico | ✅ | Los tres, más uno de contención |

**Por encima de lo pedido:** el escenario `contencion.js` no está en la lista mínima. Se
agregó porque con 4552 variantes la probabilidad de colisión es ínfima y la contención
quedaría invisible.

---

## Fase 2 — Análisis de desempeño

### A. Indicadores del lado servidor

| Requisito | Estado | Valor medido |
|---|---|---|
| Tiempo de respuesta: promedio, mediana y p90/p95/p99 | ✅ | p(95) 37,65 ms (baja) a 118,72 ms (pico) |
| Throughput | ✅ | 4,88 a 31,48 req/s |
| Tasa de error | ✅ | 0 % a 0,01 % |
| Utilización de recursos (CPU, memoria, I/O) | ⚠️ | **CPU y memoria sí**. I/O declarado como no medido (B-02) |
| Punto de saturación | ⚠️ | **No alcanzado.** Proyectado en ~503 usuarios, declarado como proyección |

### B. Indicadores de experiencia de usuario

| Requisito | Estado |
|---|---|
| Core Web Vitals | ❌ **B-03** |
| Tasa de rebote y duración de sesión | ❌ **B-03** |
| Tasa de conversión del embudo | ⚠️ Medida con k6 (6,8 %); falta la de GA4 |
| Comparación normal frente a bajo carga | ❌ **B-03** |

### 🟡 B-02 — Memoria e I/O no se analizaron

El enunciado pide utilización de "CPU, memoria, I/O". Se instrumentó y analizó **CPU**; las
métricas de memoria del proceso se recolectan (`prom-client` las expone por defecto) pero
**no se analizaron en el informe**, y no se midió I/O de disco.

**Resuelto el 15 de noviembre.** Se midió memoria y latencia del event loop bajo carga
(experimento E-09): la memoria residente se mantiene estable en ~295 MB sobre 512 MB, sin
fuga. El I/O de disco queda declarado como no medido, con su justificación.

> Corrección: la serie temporal capturada el 3 de noviembre **no** incluía las métricas de
> memoria, porque el filtro del muestreo las excluía. Hubo que volver a medir.

### 🔴 B-03 — Faltan los datos de experiencia de usuario de GA4

Es la **única sección vacía del informe** (§5.6) y cubre el plano B completo de la Fase 2.

**Causa:** k6 no ejecuta JavaScript, de modo que su tráfico no genera eventos en GA4. La
comparación exige que personas reales naveguen mientras k6 carga el servidor.

**Qué hacer:** el protocolo está en `docs/manual-ejecucion.md` §3. Requiere una hora y al
menos dos personas, **hoy**, porque GA4 demora en consolidar.

---

## Entregables

| Requisito | Estado |
|---|---|
| Código fuente del sitio y de los generadores | ✅ https://github.com/lmoral-sketch/pisada |
| Configuración de GA4 documentada con capturas | ⚠️ Documentada en texto; **faltan las capturas** |
| Resultados de las pruebas de carga | ✅ 5 reportes JSON en `carga/resultados/` |
| Informe: arquitectura | ✅ §2 |
| Informe: metodología | ✅ §4 |
| Informe: resultados con gráficos | ✅ §5, con 5 gráficos SVG |
| Informe: cuellos de botella y propuestas | ✅ §6 y §7 |
| Informe: conclusiones | ✅ §9 |
| **Video con todos los integrantes** | ❌ **B-04** |

### 🔴 B-04 — El video no existe

**Requisitos textuales:** participan todos los integrantes; se puede grabar por partes y
unir; quien presenta debe estar visible, de frente a la cámara, en una ventana, con la
presentación de fondo.

**Estado:** no iniciado. **Es el entregable que puede costar la entrega completa.**

El guion detallado está en `docs/guion-video.md`.

---

## Requisitos sobre el uso del agente de IA

| Requisito | Estado |
|---|---|
| Desarrollo apoyado en un agente generativo | ✅ Claude Code |
| Archivo de configuración `AGENTS.md` | ✅ 20 reglas |
| Registro de cada prompt con fecha, hora y modelo | ✅ `logs/prompts.md`, 14 entradas |
| Explicación de lo que generó cada prompt | ✅ |
| Analizar el log al iniciar sesión | ✅ Regla 3 de `AGENTS.md` |
| Administrador de versiones con commits periódicos | ✅ 21 commits |
| Documentar el código | ✅ |
| Español neutro latinoamericano | ✅ |
| Explicar antes de implementar | ✅ Regla 1 |
| Preguntar por commit y deploy | ✅ Reglas 18 y 19 |
| Testing automático | ⚠️ Verificación manual sistemática; **no hay pruebas automatizadas** |
| Compilar antes de terminar | ✅ Regla 15 |
| **Formulario de registro de prompts adjunto** | ❌ **B-05** |

### 🟡 B-05 — El formulario de prompts del profesor

El enunciado dice: *"Todos los prompt deben ser registrados con un formulario que se
adjunta."* **Ese formulario nunca estuvo entre los archivos recibidos.**

Nuestro `logs/prompts.md` sigue el formato del repositorio de ejemplo del profesor
(`jabtools/tiempo`), que es la mejor referencia disponible.

**Qué hacer:** buscarlo en Canvas. Si existe y tiene un formato propio, hay que trasladar las
14 entradas. Si no aparece, declarar en el informe que se usó el formato del ejemplo del
profesor.

---

## Brechas que impiden entregar

### ✅ B-06 — Nombres de los integrantes — RESUELTO

Registrados el 15 de noviembre en `README.md`, `docs/informe-fase1.md` y `PROYECTO.md`:
Catalina Araniz, Gabriel Araya, Bianca Torres, Lucas Mora y Matías Torres.

El reparto de bloques del video entre los cinco está en `docs/guion-video.md`.

### 🔴 B-07 — Manual de Identidad Visual de UTEM no aplicado

El enunciado lo lista en **Referencias**: *"Usar el Manual de Identidad Visual de UTEM."*

No se aplicó en el informe ni existe presentación. Afecta al informe y al video.

**Mitigación:** aplicar colores y logo institucionales a la presentación del video y a la
portada del informe. Es lo mínimo defendible.

---

## Plan para las próximas horas

| Prioridad | Qué | Quién | Tiempo |
|---|---|---|---|
| ~~1~~ | ~~Nombres de los integrantes (B-06)~~ | ✅ | hecho |
| 1 | Coordinar y grabar el video (B-04) | 👥 | 3 h |
| 3 | Protocolo de GA4 (B-03) | 👥 | 1 h |
| 4 | Capturas del panel de GA4 | 👤 | 15 min |
| 5 | Identidad visual en la presentación (B-07) | 👤 | 30 min |
| 6 | Buscar el formulario en Canvas (B-05) | 👤 | 10 min |
| 7 | Agregar memoria al informe (B-02) | 🤖 | 20 min |
| 8 | Declarar la brecha del sandbox (B-01) | 🤖 | 10 min |

Los puntos 7 y 8 los hace el agente. Del 1 al 6 dependen del equipo.

---

## Fortalezas que conviene destacar en el video

Cosas que están **por encima** de lo pedido y que vale la pena mencionar:

1. **Escenario de contención propio**, no exigido, que produjo el hallazgo central.
2. **Verificación de las leyes operacionales sobre datos propios**: `U = X · S` cerró exacto;
   Little permitió estimar una cola no observable.
3. **Ley de Amdahl calculada**, no citada: techo de 13,9x que cae bajo 5x con contención.
4. **Sección de errores metodológicos propios**, con cuatro equivocaciones documentadas.
5. **Reconocer que un resultado no es concluyente** en vez de elegir la corrida conveniente.
6. **Análisis de sensibilidad involuntario**: el mismo sistema en local y en Render free, con
   puntos de saturación que difieren en un orden de magnitud.
