# Marco teórico aplicado a Pisada

Cómo se traduce el formalismo del ramo —análisis operacional (Unidad 2) y teoría de
colas (Unidad 3)— a las métricas que el sistema realmente emite. Este documento es el
puente entre la cátedra y nuestras mediciones, y debe leerse junto a `hallazgos.md`.

---

## 1. El sistema como red de colas

Siguiendo el **modelo del servidor central** de la Cátedra 1.1 de Análisis Operacional, el
sistema se descompone en estaciones de servicio. Cada una es *servidor + cola asociada*:

| Estación | Recurso | Dónde se mide |
|---|---|---|
| **E1 — CPU de aplicación** | Proceso Node.js | `pisada_process_cpu_seconds_total` |
| **E2 — Pool de conexiones** | 10 conexiones a PostgreSQL | `pisada_pool_conexiones` |
| **E3 — CPU de base de datos** | Contenedor con 1 CPU | `docker stats` |
| **E4 — Bloqueo de stock** | **Una fila por SKU** | `pisada_espera_bloqueo_stock_segundos` |
| **E5 — Terminales** | Usuarios virtuales pensando | *think time* de k6 |

**E5 es una estación de retardo** (sin cola: tiempo de respuesta = tiempo de servicio), tal
como define la cátedra para los terminales. Su tiempo de servicio es el **tiempo de reflexión
Z**, que en nuestros escenarios se genera con `pensar()`.

**E4 es la estación crítica y la razón de ser del proyecto.** Es un servidor único
(`s = 1`) con disciplina FIFO, porque PostgreSQL otorga los bloqueos de fila en orden de
solicitud. En notación de Kendall es un **M/M/1/∞/∞/FCFS**.

> Es importante notar que E4 **no es una cola por producto, sino por SKU**: hay 4552 colas
> independientes, una por cada fila de `variante`. Esa es la razón por la que los escenarios
> de navegación aleatoria casi no producen contención, y por la que fue necesario el
> escenario `contencion.js` (ver `hallazgos.md`, E-01).

---

## 2. Variables operacionales

Con la notación de la cátedra, para cada dispositivo `i` durante un intervalo `T`:

| Variable | Definición | De dónde la sacamos |
|---|---|---|
| `T` | Duración de la medición | Duración del escenario k6 |
| `A` | Llegadas | `http_reqs` |
| `C` | Salidas (completions) | `http_reqs` con respuesta |
| `B` | Tiempo ocupado | `process_cpu_seconds_total` |
| `U = B/T` | **Utilización** | Calculada |
| `X = C/T` | **Productividad** | `http_reqs` por segundo |
| `λ = A/T` | Tasa de llegada | Idem, bajo equilibrio de flujo |
| `S = B/C` | Tiempo de servicio | Calculado |
| `V = Cᵢ/C₀` | **Razón de visita** | **Del CBMG** |
| `D = V·S` | Demanda de servicio | Calculada |

### El supuesto de equilibrio de flujo

La cátedra advierte que las leyes operacionales exigen que `λᵢ ≈ Xᵢ` (lo que entra es lo que
sale), aproximación válida en **intervalos de observación suficientemente largos** y con el
sistema **no saturado**.

Esto tiene una consecuencia práctica concreta para nuestras corridas: las fases de rampa de
subida y bajada **violan el supuesto**, porque durante ellas el número de usuarios cambia y
el sistema no está en estado estable. **Los cálculos operacionales deben hacerse solo sobre
las mesetas**, no sobre el total que reporta k6. Por eso los escenarios usan mesetas largas
y escalones, en lugar de rampas continuas.

---

## 3. Las cuatro leyes, aplicadas

### 3.1 Ley de Utilización — `U = X · S`

Permite obtener el tiempo de servicio de un recurso sin medirlo directamente: basta la
utilización y la productividad. Lo usaremos para separar **cuánto del tiempo de respuesta es
servicio real y cuánto es espera en cola**, que es la pregunta central del análisis.

### 3.2 Ley de Little — `N = X · R`

La relación más útil del proyecto. En nuestro caso tiene tres aplicaciones en tres niveles
distintos, exactamente como muestra la cátedra:

1. **A nivel del bloqueo de stock (E4):** `Nq = X · Wq`. Con la tasa de compras del mismo SKU
   y el tiempo de espera que medimos en `pisada_espera_bloqueo_stock_segundos`, obtenemos
   **cuántas transacciones están en promedio haciendo cola por ese SKU**. Es un número que no
   podemos observar directamente, y que la ley nos entrega.

2. **A nivel del pool de conexiones (E2):** `N = X · R` nos dice cuántas conexiones están en
   uso en promedio. Contrastarlo con `pisada_pool_conexiones{estado="total"}`, que sí
   observamos, **valida empíricamente la ley sobre datos propios**.

3. **A nivel del sistema completo:** `N = X · (R + Z)`, de donde se despeja la **ley del
   tiempo de respuesta interactivo**:

   ```
   R = N/X − Z
   ```

   Con `N` = usuarios virtuales de k6, `X` = iteraciones por segundo y `Z` = think time
   medio. Esto permite **predecir el tiempo de respuesta** a un nivel de carga, y compararlo
   con el medido.

### 3.3 Ley del flujo forzado — `Xᵢ = X₀ · Vᵢ`

Aquí hay una conexión que vale la pena destacar en el informe:

> **Las probabilidades de transición de nuestro CBMG son, literalmente, las razones de
> visita `Vᵢ` de la ley del flujo forzado.**

El CBMG define con qué frecuencia un usuario visita cada página. La ley del flujo forzado
toma esas razones de visita y determina la productividad de cada componente a partir de la
productividad del sistema. Dicho de otro modo: **el modelo de carga del material de "Modelos
de Carga en la Web" y las leyes operacionales de la Unidad 2 son dos caras del mismo
modelo.**

Consecuencia concreta: si el CBMG dice que solo el 12 % de las visitas a producto terminan
en carrito, entonces `V_checkout` es pequeña, y por la ley del flujo forzado el checkout
recibe poca carga **aunque el sistema completo esté muy cargado**. Eso explica
cuantitativamente por qué los escenarios de navegación no saturan el stock.

### 3.4 Ley general del tiempo de respuesta — `R = Σ Vᵢ · Rᵢ`

El tiempo de respuesta del sistema **no es la suma de los tiempos de cada estación**, sino la
suma ponderada por las razones de visita. Es la ley que usaremos para atribuir el tiempo
total entre componentes y responder: *¿dónde se va el tiempo?*

---

## 4. Modelo M/M/1 para el bloqueo de stock

Para E4, con `s = 1`, aplican las fórmulas cerradas de la Cátedra 1.2:

```
ρ  = λ/μ                 factor de utilización
L  = ρ/(1−ρ)             clientes en el sistema
Lq = ρ²/(1−ρ)            clientes en cola
W  = 1/(μ(1−ρ))          tiempo en el sistema
Wq = ρ/(μ(1−ρ))          tiempo en cola
```

**Lo que predice la teoría, y que debemos verificar con datos:**

- Mientras `ρ < 1` el sistema se estabiliza. Cuando `ρ → 1`, `W → ∞`: **la cola crece sin
  límite**. Ese es el punto de saturación que busca `pico.js`.
- El crecimiento **no es lineal sino hiperbólico**. Pasar de `ρ = 0,5` a `ρ = 0,9` no duplica
  la espera: la multiplica por **nueve**. Esta es la explicación formal de por qué el tiempo
  de respuesta parece estable y de pronto "explota".

**Cómo estimar los parámetros desde nuestras métricas:**

- `μ` (tasa de servicio del bloqueo) = inverso del tiempo que una transacción retiene el
  bloqueo. Se obtiene de la corrida con un solo usuario virtual, donde no hay espera.
- `λ` (tasa de llegada al SKU) = compras por segundo de esa variante, de `pisada_compras`.
- `Wq` medido = `pisada_espera_bloqueo_stock_segundos`.

Con eso se compara el `Wq` **predicho por M/M/1** contra el `Wq` **observado**. Si coinciden
razonablemente, el modelo queda validado (Etapa II de la Cátedra 1.1).

### Advertencia honesta sobre los supuestos

M/M/1 asume llegadas de Poisson y tiempos de servicio exponenciales. En nuestro escenario de
contención, **las llegadas no son de Poisson**: k6 lanza los usuarios virtuales en escalones,
lo que produce llegadas más sincronizadas que aleatorias. El modelo seguirá siendo una
aproximación útil, pero el informe debe decir esto explícitamente en lugar de presentar la
coincidencia como exacta.

Esto es justamente lo que la Cátedra 1.1 llama **validación del modelo base**: contrastar las
predicciones con la realidad y ajustar, no asumir que el modelo es correcto.

---

## 5. Ley de Amdahl sobre el checkout

El checkout tiene una fracción serializada (el descuento de stock) y una paralelizable (el
resto: renderizado, consultas de lectura, creación del pedido). Por la **Ley de Amdahl** de
la Cátedra 1.2:

```
A = 1 / [(1 − f) + f/k]
```

donde `f` es la fracción de tiempo en la porción paralelizable y `k` el factor de mejora.
Su corolario, `A_máx = 1/(1 − f)`, acota **cuánto puede mejorar el checkout por más CPU que
se le agregue**.

Esto es medible con nuestros datos: `pisada_espera_bloqueo_stock_segundos` frente a
`pisada_checkout_duracion` da directamente la fracción serializada. Poder **calcular el techo
teórico de mejora con mediciones propias**, y no citar la ley en abstracto, es el aporte más
fuerte que puede tener el informe.

---

## 6. Qué hay que calcular para el informe

- [ ] `U`, `X`, `S` y `D` por estación, en cada meseta de `pico.js`
- [ ] Curva `X` frente a usuarios virtuales → identificar el punto donde `X` se aplana
- [ ] Curva `R` frente a usuarios virtuales → identificar el codo
- [ ] Verificar la ley de Little en los tres niveles
- [ ] Estimar `ρ`, `μ` y `λ` de E4 y contrastar `Wq` predicho contra observado
- [ ] Calcular la fracción serializada del checkout y aplicar Amdahl
- [ ] Ajustar las probabilidades del CBMG con datos de GA4 (Etapa II)
