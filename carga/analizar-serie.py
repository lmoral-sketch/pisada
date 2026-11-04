import re, io
muestras = []
actual = {}
for linea in io.open("metricas-serie.txt", encoding="utf-8", errors="replace"):
    linea = linea.strip()
    m = re.match(r"^--- (\d\d):(\d\d):(\d\d) ---$", linea)
    if m:
        if actual.get("t") is not None: muestras.append(actual)
        h, mi, s = map(int, m.groups())
        actual = {"t": h*3600 + mi*60 + s}
        continue
    if not actual: continue
    if linea.startswith("pisada_process_cpu_seconds_total "):
        actual["cpu"] = float(linea.split()[1])
    elif 'en_espera"}' in linea:
        actual["espera"] = float(linea.split()[1])
    elif linea.startswith("pisada_compras_sin_stock_total "):
        actual["sinstock"] = float(linea.split()[1])
if actual.get("t") is not None: muestras.append(actual)

muestras = [m for m in muestras if "cpu" in m]
# Corrige el cruce de medianoche
base = muestras[0]["t"]
for m in muestras:
    if m["t"] < base: m["t"] += 86400

print(f"muestras utiles: {len(muestras)}")

# El escenario de pico son los ultimos 14 min (840 s) de la serie.
fin = muestras[-1]["t"]
pico = [m for m in muestras if m["t"] >= fin - 850]
print(f"muestras del pico: {len(pico)}  ({pico[-1]['t']-pico[0]['t']} s)")

# Etapas de pico.js, en segundos desde el inicio del escenario.
etapas = [
    (0,30,"rampa->25"), (30,150,"MESETA 25 VU"),
    (150,180,"rampa->50"), (180,300,"MESETA 50 VU"),
    (300,330,"rampa->100"), (330,450,"MESETA 100 VU"),
    (450,480,"rampa->200"), (480,600,"MESETA 200 VU"),
    (600,630,"rampa->350"), (630,750,"MESETA 350 VU"),
    (750,810,"rampa->0"),
]
t0 = pico[0]["t"]
print(f"\n{'etapa':<16} {'CPU app':>9} {'pool espera':>12} {'max espera':>11}")
print("-" * 52)
for ini, fin_e, nombre in etapas:
    tramo = [m for m in pico if ini <= m["t"]-t0 < fin_e]
    if len(tramo) < 2: continue
    dt = tramo[-1]["t"] - tramo[0]["t"]
    if dt <= 0: continue
    util = (tramo[-1]["cpu"] - tramo[0]["cpu"]) / dt
    esperas = [m.get("espera", 0) for m in tramo]
    media = sum(esperas)/len(esperas)
    print(f"{nombre:<16} {util*100:>8.1f}% {media:>12.2f} {max(esperas):>11.0f}")

# --- Ley de utilizacion sobre el escenario de pico completo ---
cpu_pico = pico[-1]["cpu"] - pico[0]["cpu"]
dur = pico[-1]["t"] - pico[0]["t"]
PETICIONES = 26447          # http_reqs reportado por k6
print(f"\n=== LEY DE UTILIZACION (pico completo) ===")
print(f"  B (CPU ocupada)     = {cpu_pico:.1f} s")
print(f"  T (duracion)        = {dur} s")
print(f"  U = B/T             = {cpu_pico/dur*100:.1f} %")
print(f"  X = C/T             = {PETICIONES/dur:.2f} pet/s")
print(f"  S = B/C             = {cpu_pico/PETICIONES*1000:.2f} ms de CPU por peticion")
print(f"  Comprobacion U=X*S  = {(PETICIONES/dur)*(cpu_pico/PETICIONES)*100:.1f} %")

# --- Amdahl sobre el checkout ---
ESPERA_SUM, ESPERA_N = 2.1148488, 655
CHECKOUT_AVG = 0.04495     # s, reportado por k6 en el pico
wq = ESPERA_SUM/ESPERA_N
f_serie = wq/CHECKOUT_AVG
print(f"\n=== LEY DE AMDAHL SOBRE EL CHECKOUT ===")
print(f"  Wq medio (espera de bloqueo) = {wq*1000:.2f} ms")
print(f"  Duracion media del checkout  = {CHECKOUT_AVG*1000:.2f} ms")
print(f"  Fraccion serializada         = {f_serie*100:.1f} %")
print(f"  Fraccion paralelizable f     = {1-f_serie:.3f}")
print(f"  Aceleracion maxima A = 1/(1-f) = {1/f_serie:.1f}x")
for k in (2, 4, 8):
    a = 1/((f_serie) + (1-f_serie)/k)
    print(f"    con k={k}: A = {a:.2f}x  (mejora del {(a-1)*100:.0f} %)")

# --- Extrapolacion del punto de saturacion ---
print(f"\n=== EXTRAPOLACION DEL PUNTO DE SATURACION (CPU de la app) ===")
pend = (76.1 - 52.6) / (350 - 200)
vu_sat = 350 + (100 - 76.1)/pend
print(f"  Pendiente entre 200 y 350 VU = {pend:.3f} %CPU por VU")
print(f"  Proyeccion a U=100%          = ~{vu_sat:.0f} VU")
