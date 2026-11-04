# Hallazgos experimentales

Registro de los experimentos ejecutados y lo que arrojaron. Alimenta la sección de
resultados y análisis del informe técnico.

---

## E-01 — Primera verificación end-to-end y prueba de contención

**Fecha:** 3 de noviembre de 2026
**Entorno:** local. PostgreSQL 16.15 en contenedor con límites de **1 CPU y 512 MB**;
aplicación Next.js en modo producción (`next start`); pool de 10 conexiones.
**Catálogo:** 240 productos, **4552 variantes**, 539 sin stock (11,8 %), 80.989 unidades.

### Línea base de tiempos de respuesta (sin carga)

| Página | Tiempo | Observación |
|---|---|---|
| `/` (home) | 20 ms | La más liviana, como se diseñó |
| `/producto/[slug]` | 20 ms | Peso intermedio |
| `/catalogo` | 44 ms | **El doble que el home** |
| `/catalogo` con filtros | 30 ms | El filtro reduce el conjunto a agregar |

El catálogo cuesta aproximadamente **2,2 veces** el home sin ninguna carga encima. La
diferencia de peso entre páginas quedó establecida tal como se buscaba (decisión D-02), y
sirve de referencia para medir cuánto se separan bajo carga.

> Dato contraintuitivo: el catálogo **filtrado** salió más barato que el sin filtrar. Es
> coherente: el filtro reduce la cantidad de filas a agrupar. Conviene confirmarlo bajo
> carga, donde el costo de evaluar el filtro podría dejar de compensar.

### Prueba de contención: 60 compradores simultáneos, 50 unidades

Se fijó el stock de una variante en 50 unidades y se lanzaron **60 peticiones de pago
concurrentes** sobre ella, con cada cliente en su propia sesión.

**Estrategia pesimista** (`SELECT ... FOR UPDATE`):

| Desenlace | Peticiones | Media | Máximo |
|---|---|---|---|
| `200` compra exitosa | **50** | 25 ms | 59 ms |
| `409` sin stock | **10** | 12 ms | 14 ms |

**Estrategia optimista** (UPDATE condicional con reintentos):

| Desenlace | Peticiones | Media | Máximo |
|---|---|---|---|
| `200` compra exitosa | **50** | 23 ms | 65 ms |
| `409` sin stock | **10** | 23 ms | 76 ms |

**Stock final en ambos casos: 0. Variantes con stock negativo en toda la base: 0.**

### Lo que esto demuestra

1. **No hay sobreventa.** Con 60 compradores peleando por 50 unidades, se vendieron
   exactamente 50 y se rechazaron exactamente 10. El control de concurrencia funciona:
   sin él, varias transacciones habrían leído "stock = 50" a la vez y el inventario
   habría quedado negativo.
2. **No hay interbloqueos.** El orden global de bloqueo (decisión D-08) cumplió su
   función: ninguna transacción fue abortada por deadlock.
3. **Los rechazos son limpios.** Los 10 fallos devolvieron `409`, distinguibles de un
   error del sistema, tal como se diseñó en D-06.

### Hallazgo inesperado: la estrategia optimista no reintentó ni una vez

`pisada_reintentos` quedó en **cero** durante toda la corrida optimista, pese a los 60
clientes simultáneos.

**Explicación.** En PostgreSQL, bajo el nivel de aislamiento `READ COMMITTED` (el que viene
por defecto), un `UPDATE` que intenta modificar una fila **bloqueada por otra transacción no
falla: espera**. Cuando la transacción bloqueante confirma, PostgreSQL **vuelve a evaluar**
la condición `WHERE stock >= cantidad` sobre la versión nueva de la fila y, si se sigue
cumpliendo, aplica la actualización.

Es decir, nuestra implementación "optimista" **también hace cola sobre la misma fila**. El
reintento solo se dispara cuando la reevaluación falla, y en ese caso el stock
efectivamente se agotó — que es justamente cuando devolvemos `409`. De ahí el cero.

**Consecuencia para el análisis.** Las dos estrategias serializan en el mismo punto, y eso
explica que sus tiempos sean casi idénticos (25 ms frente a 23 ms de media). La diferencia
teórica entre "esperar" y "reintentar" **no se manifiesta con una sola fila en disputa bajo
`READ COMMITTED`**.

Esto no invalida la comparación: la vuelve más interesante, porque es un resultado que
contradice la intuición inicial documentada en `checkout.ts`. Para que la estrategia
optimista se comporte realmente como tal habría que usar el aislamiento
`REPEATABLE READ`, donde PostgreSQL **aborta** la transacción con un error de serialización
en vez de esperar, obligando al reintento.

> **Pendiente de experimentación:** repetir la prueba con `REPEATABLE READ` en la rama
> optimista y comparar las tres configuraciones. Ese contraste, con la explicación del
> mecanismo de `READ COMMITTED` detrás, es material de primer nivel para el informe.

### Estado del sistema durante la prueba

- `pisada_pool_conexiones{estado="en_espera"} 0` — el pool de 10 conexiones **nunca se
  saturó** con este nivel de concurrencia. El cuello de botella todavía no es el pool.
- `pisada_compras_sin_stock_total 20` — consistente con los 10 + 10 rechazos.
- `pisada_espera_bloqueo_stock_segundos` acumuló 61 observaciones en pesimista y 60 en
  optimista, con sumas de 151 ms y 109 ms respectivamente. La espera por operación es de
  pocos milisegundos: **a este nivel de carga la contención existe pero aún no duele**.

### Qué falta

La prueba se hizo con `curl` en paralelo, que es suficiente para demostrar correctitud pero
no para caracterizar la degradación. Los escenarios de k6 (`carga/escenarios/`) todavía no
se han ejecutado ni una vez: son los que entregarán la curva de saturación y los
percentiles del informe.

---
