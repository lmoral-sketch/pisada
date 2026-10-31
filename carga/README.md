# Generadores de carga

Scripts de k6 para la Fase 1.2 y la Fase 2 del trabajo.

## Instalación de k6

Windows, con winget:

```
winget install k6 --source winget
```

Verificar: `k6 version`.

## Los escenarios

| Archivo | Qué hace | Para qué sirve |
|---|---|---|
| `baja.js` | 5 usuarios virtuales, 3 min | **Línea base.** Sin esto, ningún otro número significa nada |
| `normal.js` | 25 VU, meseta de 8 min | Operación habitual; busca degradación progresiva |
| `pico.js` | Escalones 25 → 350 VU | Encuentra el **punto de saturación** |
| `contencion.js` | Todos contra un mismo SKU | Provoca la **espera en cola** sobre el stock |

`comun.js` contiene el modelo CBMG y los pasos del embudo compartidos.

## Cómo correrlos

```
k6 run carga/escenarios/baja.js
```

Contra el sitio desplegado:

```
k6 run -e BASE_URL=https://pisada.onrender.com carga/escenarios/normal.js
```

Guardando el reporte para el informe:

```
k6 run --out json=carga/resultados/normal-2026-11-10.json carga/escenarios/normal.js
```

## Orden recomendado

1. **`baja.js` primero, siempre.** Es la referencia.
2. `normal.js`, comparando el primer minuto de meseta contra el último.
3. `pico.js`, para la curva de saturación.
4. `contencion.js`, una corrida por estrategia, con variantes distintas.

Entre corridas conviene **regenerar la semilla** (`npm run semilla`), porque las
pruebas consumen inventario real. Si la segunda corrida parte con el stock que
agotó la primera, medirá puros rechazos y no será comparable.

## Qué mirar en los resultados

**De k6:**
- `http_req_duration` con `p(90)`, `p(95)`, `p(99)` — el enunciado pide percentiles, no promedios
- `http_reqs` — throughput
- `pisada_checkout_duracion` — el checkout aislado del resto
- `pisada_sin_stock` y `pisada_conflictos`
- `pisada_tasa_conversion`

**Del servidor**, en `/api/metricas` durante la corrida:
- `pisada_espera_bloqueo_stock_segundos` — la espera en cola
- `pisada_consulta_duracion_segundos` — ¿la degradación es de la base o de la app?
- `pisada_pool_conexiones{estado="en_espera"}` — si crece, el pool es el cuello de botella
- `pisada_process_cpu_*` y `pisada_nodejs_*` — utilización de recursos

## Dos advertencias

**El think time no es decorativo.** Sin él, cada usuario virtual genera cientos de
peticiones por segundo y 50 VU equivaldrían a miles de personas reales. El
"número de usuarios soportados" que reportarías sería absurdo.

**Nunca apuntar estos scripts a un sitio ajeno.** Solo contra el despliegue propio
o el entorno local. Generar tráfico contra infraestructura de terceros no está
autorizado.
