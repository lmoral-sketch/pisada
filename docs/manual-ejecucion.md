# Manual de ejecución

Todo lo necesario para correr las mediciones sin ayuda externa. Comandos listos para copiar.

**Sitio:** https://pisada.onrender.com
**Repositorio:** https://github.com/lmoral-sketch/pisada
**GA4:** `G-P8EWE6D7G3`

---

## 0. Preparar el entorno (una vez)

Todos los comandos se ejecutan desde la carpeta del proyecto:

```
cd E:\Estudios\Proyectos\Desempeño\proyecto
```

### Entorno local (para pruebas sin tocar producción)

```
docker compose up -d
```

```
cd web && npm run build && npm run start
```

El sitio local queda en `http://localhost:3000`.

### Regenerar el catálogo

Las pruebas de carga **consumen inventario**. Entre corridas comparables hay que resembrar:

```
cd web && npm run semilla
```

> Contra Neon toma ~1 minuto; contra la base local, 8 segundos.

---

## 1. Despertar los servicios (SIEMPRE antes de medir)

Render suspende el sitio tras 15 minutos de inactividad, y Neon suspende la base tras 5.
El primer acceso puede tardar **hasta 50 segundos**.

```
curl https://pisada.onrender.com/catalogo
```

Repetir hasta que responda en menos de 1 segundo. **Si no se hace, los primeros percentiles
miden arranques en frío y no sirven.**

Para ver el tiempo:

```
curl -s -o nul -w "%{time_total}s\n" https://pisada.onrender.com/catalogo
```

---

## 2. Calibrar la escala de carga

Render free entrega **0,1 CPU**, diez veces menos que el contenedor local. Los escalones de
`pico.js` (hasta 350 usuarios) casi con seguridad tumbarán el sitio antes de dar datos
útiles.

**Hacer primero una corrida exploratoria corta:**

```
k6 run -e BASE_URL=https://pisada.onrender.com --vus 10 --duration 2m carga/escenarios/baja.js
```

Luego repetir con `--vus 25` y `--vus 50`.

### Qué mirar en cada corrida

| Métrica | Qué significa |
|---|---|
| `http_req_duration p(95)` | Si supera 2 s, ya está degradado |
| `http_req_failed` | Si supera 5 %, el sitio está colapsando |
| `iterations` | Si cae al subir usuarios, pasó el punto de saturación |

**Regla práctica:** el nivel más alto donde el p(95) se mantenga bajo 1,5 s y el error bajo
1 % es el techo útil. Usar ese valor como máximo para la sesión bajo carga del punto 3.

---

## 3. Protocolo de dos sesiones para GA4

> **Por qué:** k6 no ejecuta JavaScript, así que su tráfico **no genera eventos en GA4**. La
> comparación "normal frente a bajo carga" que pide la Fase 2 solo sale si **personas reales
> navegan mientras k6 carga el servidor**.

### 3.1 Despertar (paso 1 de este manual)

### 3.2 Sesión A — CONTROL, sin carga

**Anotar la hora exacta de inicio.**

Cada integrante, desde su propio equipo:

1. Abrir `https://pisada.onrender.com`
2. Ir al **Catálogo**
3. Aplicar un filtro (categoría, talla o color)
4. Abrir una **ficha de producto**
5. Elegir una talla y **Agregar al carrito**
6. Ir al **Carrito** y **Pagar**
7. Repetir el recorrido completo **3 veces**, a ritmo normal

**Anotar la hora de término.** Duración objetivo: 15 minutos.

### 3.3 Sesión B — BAJO CARGA

**Anotar la hora de inicio.**

En una terminal, lanzar la carga con el nivel calibrado en el paso 2:

```
k6 run -e BASE_URL=https://pisada.onrender.com --vus 25 --duration 15m carga/escenarios/baja.js
```

**Mientras k6 corre**, los mismos integrantes repiten **exactamente el mismo recorrido**,
otras 3 veces cada uno.

**Anotar la hora de término.**

### 3.4 Recolectar en GA4 (al día siguiente)

GA4 demora en consolidar. Al día siguiente, en https://analytics.google.com:

| Qué buscar | Dónde |
|---|---|
| Core Web Vitals | Informes → Interacción → Páginas y pantallas |
| Tasa de rebote | Informes → Interacción → Páginas y pantallas |
| Duración media de sesión | Informes → Interacción → Descripción general |
| Páginas por sesión | Informes → Interacción → Descripción general |
| **Embudo de conversión** | Informes → Monetización → Comercio electrónico |

Para comparar las dos franjas: ajustar el rango de fechas y usar **Comparaciones** por hora.

**Capturar pantalla de cada una.** Van al informe como evidencia.

---

## 4. Medir el lado servidor durante una corrida

Mientras k6 corre, en **otra terminal**, muestrear las métricas cada segundo:

```
for /l %i in (1,1,900) do @(curl -s https://pisada.onrender.com/api/metricas >> metricas.txt & echo --- >> metricas.txt & timeout /t 1 >nul)
```

En Git Bash:

```
for i in $(seq 1 900); do echo "--- $(date +%H:%M:%S) ---" >> metricas.txt; curl -s https://pisada.onrender.com/api/metricas | grep -E '^pisada_(pool|espera|compras_sin|process_cpu)' >> metricas.txt; sleep 1; done
```

Después, procesar con el script del proyecto:

```
python carga/analizar-serie.py
```

### Métricas clave

| Métrica | Qué responde |
|---|---|
| `pisada_process_cpu_seconds_total` | Utilización de CPU (derivar en el tiempo) |
| `pisada_pool_conexiones{estado="en_espera"}` | Cola sobre el pool. **Si crece, es el cuello de botella** |
| `pisada_espera_conexion_segundos` | Cuánto se espera por una conexión |
| `pisada_espera_bloqueo_stock_segundos` | Espera en cola sobre el SKU |
| `pisada_consulta_duracion_segundos` | ¿La degradación viene de la base o de la app? |

---

## 5. Experimento de contención

Provoca la cola sobre un mismo SKU. Requiere preparar stock abundante primero.

### 5.1 Elegir una variante y darle stock

En local:

```
docker compose exec -T postgres psql -U pisada -d pisada -c "UPDATE variante SET stock=30000 WHERE id IN (1500,1501);"
```

En Neon: usar el editor SQL de la consola web con la misma sentencia.

### 5.2 Correr una estrategia por vez

```
k6 run -e VARIANTE_ID=1500 -e ESTRATEGIA=pesimista carga/escenarios/contencion.js
```

```
k6 run -e VARIANTE_ID=1501 -e ESTRATEGIA=optimista carga/escenarios/contencion.js
```

> ⚠️ Usar una **variante distinta** para cada estrategia, o reponer el stock entre corridas.
> Si la segunda parte con el inventario agotado por la primera, medirá solo rechazos.

### 5.3 Repetir

**Los resultados de una sola corrida no son confiables** (ver `docs/hallazgos.md`, E-04: el
p(95) varió dos órdenes de magnitud entre corridas idénticas). Hay que correr **al menos 5
veces cada configuración** y reportar mediana y rango, no una corrida suelta.

---

## 6. Guardar resultados para el informe

```
k6 run --summary-export=carga/resultados/NOMBRE.json -e BASE_URL=https://pisada.onrender.com carga/escenarios/normal.js
```

Los archivos en `carga/resultados/` se versionan y son uno de los entregables exigidos.

---

## 7. Publicar cambios

```
git add -A
```

```
git commit -m "descripcion del cambio"
```

```
git push origin master
```

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| Primera petición tarda 50 s | Render suspendido | Despertar con `curl` antes de medir |
| Todos los checkouts dan 409 | Stock agotado por corridas previas | `npm run semilla` |
| El p(95) varía muchísimo entre corridas | Régimen inestable por saturación | Bajar los usuarios virtuales; repetir 5 veces |
| GA4 no muestra eventos | k6 no ejecuta JavaScript | Navegar con un navegador real |
| El despliegue de Render falla | `render.yaml` ignorado | *Settings → Root Directory* = `web` |
| `npm run semilla` tarda minutos | Apunta a Neon, no a local | Normal: ~1 min contra Neon |

---

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Informe técnico | `docs/informe-fase1.md` |
| Resultados de los experimentos | `docs/hallazgos.md` |
| Teoría aplicada al sistema | `docs/marco-teorico.md` |
| Decisiones de diseño | `docs/decisiones.md` |
| Plan de entrega con fechas | `docs/plan-entrega.md` |
| Registro de prompts | `logs/prompts.md` |
| Escenarios de k6 | `carga/escenarios/` |
| Credenciales de Neon | `web/.env.neon` *(no se sube a Git)* |
