# Auditoría final de calidad

Segunda auditoría del trabajo. La primera (`auditoria.md`) revisó **cumplimiento del
enunciado**: si están todos los entregables. Esta revisa **calidad**: si lo entregado se
sostiene.

**Fecha:** 18 de noviembre de 2026 · **Entrega:** miércoles 19

---

## 1. ¿Cada conclusión tiene evidencia detrás?

Se revisaron las nueve afirmaciones centrales del informe contra el experimento que las
respalda.

| # | Afirmación | Evidencia | ¿Se sostiene? |
|---|---|---|---|
| 1 | El sistema no se degrada hasta 25 usuarios | E-12: 35,30 ms vs 36,12 ms | ✅ Medido |
| 2 | El punto de saturación está en 350 usuarios | E-12: 96,6 % de CPU | ✅ Medido |
| 3 | La CPU por usuario decrece antes que la latencia | E-03, E-12: 0,416 → 0,276 % | ✅ Medido |
| 4 | El cuello de botella es el pool, no la CPU | E-15: CPU igual, latencia 5,9x | ❌ **Refutado en E-16: no se reproduce** |
| 5 | La contención de stock se propaga al pool | E-12: 4 → 40 → 222 en espera | ✅ Medido |
| 6 | `U = X · S` se cumple | E-03: 31,11 × 0,01127 = 35,1 % | ✅ Verificado |
| 7 | El techo de Amdahl del checkout es 13,9x | E-03, E-11 | ⚠️ **Ver hallazgo A-1** |
| 8 | El peso de las páginas determina la saturación | E-12: 76,1 % → 96,6 % | ✅ Medido |
| 9 | No se puede decir qué estrategia es mejor | E-13: rangos solapados | ✅ Correctamente declarado |

**Ocho de nueve se sostienen con medición directa.** La novena tiene una salvedad.

### ⚠️ A-1 — El techo de Amdahl se calculó con el diseño anterior

La fracción serializada del checkout (7,2 %) se midió el 4 de noviembre, **antes del
rediseño** que cambió el peso de las páginas. El checkout en sí no se tocó, de modo que su
tiempo absoluto no debería haber cambiado, pero **no se volvió a medir**.

**Riesgo:** bajo. El rediseño afectó el renderizado de catálogo y detalle, no la ruta
`/api/checkout`, que no devuelve HTML.

**Recomendación:** declararlo en el informe como cifra tomada antes del rediseño, o volver a
medirla. Lo segundo toma unos 5 minutos.

---

## 2. ¿Hay afirmaciones sin número?

Se buscaron afirmaciones cuantitativas sin medición que las respalde.

| Afirmación | Estado |
|---|---|
| *"El I/O de disco no participa del camino crítico"* | ⚠️ **Razonado, no medido.** Declarado como tal en §5.4 |
| *"La pesimista es propensa a excursiones"* | ✅ Declarado explícitamente como insuficiente (2 casos de 5) |
| *"Las llegadas no son de Poisson"* | ✅ Declarado como limitación del modelo |
| *"El equilibrio de flujo no se cumple en rampas"* | ✅ Declarado, y los cálculos se hacen sobre mesetas |

**No se encontraron afirmaciones cuantitativas presentadas como medidas sin estarlo.**

---

## 3. ¿El código entregado coincide con el informe?

| Aspecto | Informe dice | Código hace | ¿Coincide? |
|---|---|---|---|
| Pool por defecto | Recomienda 20 | `?? 20` | ✅ *(corregido en esta auditoría)* |
| Conteo de paginación | Propuesta refutada | Exacto por defecto | ✅ |
| Estrategia de stock | Pesimista por defecto | `ESTRATEGIA_STOCK` | ✅ |
| Dos caminos de pago | Propio + Webpay | Ambos presentes | ✅ |
| Sin ORM | SQL directo | `pg` con SQL literal | ✅ |
| Sin imágenes externas | SVG en línea | 0 archivos de imagen | ✅ |

### 🔴 A-2 — Corregido durante esta auditoría

El informe recomendaba subir el pool a 20, pero **`db.ts` y `.env.example` seguían con 10**.
Un revisor que clonara el repositorio habría obtenido la configuración que el propio informe
declara inferior.

Corregido: ambos ahora en 20, con el comentario que explica la medición.

---

## 4. ¿Los documentos se contradicen entre sí?

Tras dieciocho días y treinta y siete commits, el riesgo de contradicción es real.

| Revisión | Resultado |
|---|---|
| Cifras del diseño anterior en documentos vigentes | ✅ Corregidas (4 casos) |
| `hallazgos.md` con cifras antiguas | ✅ **Correcto**: es bitácora fechada |
| Punto de saturación: ¿proyección o medición? | ✅ Unificado como medición |
| Línea base: ¿p(95) o mediana? | ✅ Unificado en mediana, con el motivo |
| Propuestas 7.1 y 7.5 | ✅ Ambas marcadas con su desenlace |

> **Distinción que se mantuvo a propósito:** `hallazgos.md` es registro histórico fechado;
> el informe es estado actual. Reescribir el primero habría falseado el historial.

---

## 5. Calidad de la evidencia

| Experimento | Repeticiones | ¿Suficiente? |
|---|---|---|
| E-12 saturación | 1 | ⚠️ Una corrida, pero la curva es monótona y coherente |
| E-13 estrategias | 5 por estrategia | ✅ Y por eso se concluye que **no** se puede concluir |
| E-14 conteo | 1 por configuración | ⚠️ La diferencia era del 1,4 %: nula, no ambigua |
| E-15 pool | 1 por configuración | ⚠️ **Ver A-3** |

### ❌ A-3 — RESUELTO, con resultado negativo

**El hallazgo era falso.** Se repitió el experimento tres veces por configuración (E-16) y la
diferencia no se reprodujo: los rangos de p(95) de pool 5, 10 y 20 se solapan por completo, y
ninguna de las ocho corridas válidas pasó de 276 ms, frente a los 916 y 1.000 ms que había dado
la medición original.

**Los atenuantes que se habían escrito aquí resultaron ser el error.** Decían: *la diferencia es
enorme, la tendencia es monótona, el mecanismo tiene explicación coherente*. Los tres eran
ciertos y ninguno era suficiente. La magnitud de un efecto no dice nada sobre su robustez
cuando la distribución tiene cola pesada; la monotonía sobre tres puntos sin repetición es
indistinguible del azar; y un mecanismo plausible hace más fácil aceptar un resultado falso, no
más probable que sea verdadero.

**Lo corregido:** `PG_POOL_MAX` vuelve a 10 en `db.ts`, `.env.example` y `render.yaml`; el
gráfico `tamano-pool.svg` se eliminó; §7.5 del informe se reescribió como propuesta refutada;
§6.2 pasa de «confirmado por intervención» a hipótesis no demostrada; el resumen ejecutivo y las
conclusiones se ajustaron. La bitácora E-16 tiene los datos crudos.

**Valor del hallazgo A-3.** Esta auditoría encontró, y la repetición confirmó, un error que
habría llegado al informe entregado como su conclusión más vistosa. Es el argumento más fuerte
a favor de auditar el propio trabajo antes de entregarlo.

---

## 6. Resumen de hallazgos

| # | Hallazgo | Gravedad | Estado |
|---|---|---|---|
| A-1 | Techo de Amdahl medido antes del rediseño | Baja | ⚠️ Declarado; la remedición salió mal diseñada |
| A-2 | Código con pool 10 mientras el informe decía 20 | **Alta** | ✅ Corregido |
| A-3 | El experimento del pool no se repitió | **Alta** | ✅ Repetido: el hallazgo era falso, revertido |

---

## 7. Lo que queda por mejorar

### 🔴 Bloquea la entrega

**El video.** Único entregable que falta. El guion está repartido entre los cinco y se puede
grabar por separado.

### 🟡 Sumaría, si hay tiempo

| Mejora | Esfuerzo | Qué aporta |
|---|---|---|
| Repetir el experimento del pool 3 veces | 2,5 h | Cierra A-3 |
| Volver a medir el techo de Amdahl | 5 min | Cierra A-1 |
| Buscar el óptimo del pool (30, 40, 60) | 1 h | Hoy solo sabemos que 20 > 10 |
| Exportar el informe a PDF con la portada | 15 min | Presentación |

### ⚪ Fuera de alcance para esta entrega

- Pruebas automatizadas (el `AGENTS.md` las promete; hay verificación manual sistemática)
- Medir I/O de disco
- Probar la estrategia optimista con `REPEATABLE READ`

---

## 8. Valoración general

**El trabajo se sostiene.** Ocho de nueve conclusiones centrales están respaldadas por
medición directa, y la novena está correctamente declarada como no concluyente.

Lo que distingue a este informe de uno que solo reporta números:

1. **Tres hipótesis propias refutadas por medición propia** — la interpretación del
   `COUNT(*)`, el comportamiento esperado del pool y el de la estrategia optimista.
2. **Una conclusión que se niega a concluir** cuando la evidencia no alcanza.
3. **Cuatro errores de método documentados** en vez de ocultados.
4. **Una cadena causal cerrada por intervención**, no solo por correlación.

El punto más débil es A-3: el hallazgo de mayor impacto descansa en una sola corrida. Debe
repetirse o declararse.

---

## Cierre de la auditoría — 17 de noviembre de 2026

| # | Hallazgo | Desenlace |
|---|---|---|
| A-1 | Amdahl medido antes del rediseño | **Declarado en §8.7.** Se intentó remedir y el script quedó mal diseñado: corrió el escenario de contención (40 usuarios sobre un SKU) en lugar de carga normal con SKU aleatorios, de modo que su resultado (≈62 % de fracción serializada) no es comparable con el 7,2 % original. El defecto del script queda escrito en §8.7; la limitación sigue abierta. |
| A-2 | Código con pool 10 mientras el informe decía 20 | **Corregido**, y luego irrelevante: E-16 refutó el hallazgo que motivaba el 20. |
| A-3 | El experimento del pool no se repitió | **Repetido. El hallazgo era falso.** Revertido en código, configuración, gráfico e informe. |

**Lo que la auditoría cambió realmente.** Encontró una conclusión falsa que iba a entregarse
como el resultado principal del trabajo, y una discrepancia entre el código y el informe. Las
dos se detectaron leyendo el proyecto contra sí mismo, no corriendo nada nuevo.

**Lo que queda declarado y no resuelto**, por honestidad y no por falta de tiempo:

1. La fracción serializada del checkout en carga normal (7,2 %) no se remidió con el diseño
   actual (§8.7).
2. Por qué la misma configuración dio 916 ms el 16 de noviembre y ~150 ms el 17 (E-16). La
   varianza entre días excede cualquier efecto que el trabajo intentó medir en ese experimento,
   y entenderla exigiría un entorno de medición aislado del que no se dispone.
3. Los resultados de contención no son reproducibles (§8.4), así que no se concluye nada sobre
   cuál estrategia de concurrencia es mejor.
