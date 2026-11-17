#!/usr/bin/env bash
#
# Repite el experimento de contención varias veces por estrategia.
#
# Existe porque una sola corrida NO permite concluir nada: el experimento E-04
# documentó que entre dos tandas idénticas el p(95) varió dos órdenes de
# magnitud y el orden entre estrategias se invirtió. Para comparar hace falta
# reportar mediana y rango sobre varias repeticiones.
#
# Antes de cada corrida se repone el stock de la variante en disputa. Sin eso,
# la segunda corrida partiría con el inventario que agotó la primera y mediría
# rechazos en vez de contención.
#
# Uso:
#   bash carga/repetir-contencion.sh [repeticiones] [variante_id]
#
set -u

REPETICIONES=${1:-5}
VARIANTE=${2:-1500}
VU_MAX=${3:-120}
STOCK=30000
SALIDA="carga/resultados/contencion-vu${VU_MAX}.tsv"

export PATH="$PATH:/c/Program Files/k6:/c/Users/lucas/AppData/Local/Programs/DockerDesktop/resources/bin"

printf 'estrategia\trepeticion\tp95_ms\tp99_ms\tmedia_ms\tthroughput\terror_pct\tcompras\n' > "$SALIDA"

for ESTRATEGIA in pesimista optimista; do
  for n in $(seq 1 "$REPETICIONES"); do
    echo "--- $ESTRATEGIA, repeticion $n de $REPETICIONES ---"

    # Reponer el inventario de la variante en disputa.
    docker compose exec -T postgres psql -U pisada -d pisada -q \
      -c "UPDATE variante SET stock=$STOCK WHERE id=$VARIANTE;" > /dev/null 2>&1

    TMP=$(mktemp)
    k6 run -e VARIANTE_ID="$VARIANTE" -e ESTRATEGIA="$ESTRATEGIA" -e VU_MAX="$VU_MAX" \
      --summary-export="$TMP" carga/escenarios/contencion.js > /dev/null 2>&1

    # Extraer las cifras del resumen JSON de k6.
    python - "$TMP" "$ESTRATEGIA" "$n" "$SALIDA" <<'PY'
import json, sys
ruta, estrategia, rep, salida = sys.argv[1:5]
with open(ruta, encoding='utf-8') as f:
    d = json.load(f)
m = d.get('metrics', {})
dur = m.get('http_req_duration', {})
fallo = m.get('http_req_failed', {})
reqs = m.get('http_reqs', {})
compras = m.get('pisada_compras', {})

def g(dic, *claves):
    for c in claves:
        if c in dic:
            return dic[c]
    return 0

fila = [
    estrategia, rep,
    f"{g(dur,'p(95)'):.1f}",
    f"{g(dur,'p(99)'):.1f}",
    f"{g(dur,'avg'):.1f}",
    f"{g(reqs,'rate'):.2f}",
    f"{g(fallo,'value','rate')*100:.2f}",
    f"{g(compras,'count'):.0f}",
]
with open(salida, 'a', encoding='utf-8') as f:
    f.write('\t'.join(str(x) for x in fila) + '\n')
print('  ' + '  '.join(str(x) for x in fila))
PY
    rm -f "$TMP"
  done
done

echo
echo "=== RESUMEN: mediana y rango por estrategia ==="
python - "$SALIDA" <<'PY'
import sys, statistics as st
from collections import defaultdict
datos = defaultdict(lambda: defaultdict(list))
with open(sys.argv[1], encoding='utf-8') as f:
    cab = f.readline().strip().split('\t')
    for linea in f:
        v = linea.strip().split('\t')
        if len(v) < len(cab): continue
        est = v[0]
        for i, col in enumerate(cab[2:], start=2):
            datos[est][col].append(float(v[i]))

print(f"{'estrategia':<12} {'metrica':<12} {'mediana':>10} {'minimo':>10} {'maximo':>10} {'razon':>8}")
print('-' * 68)
for est in ('pesimista', 'optimista'):
    for col in ('p95_ms', 'p99_ms', 'media_ms', 'throughput', 'error_pct'):
        vs = datos[est][col]
        if not vs: continue
        razon = max(vs) / min(vs) if min(vs) > 0 else float('inf')
        print(f"{est:<12} {col:<12} {st.median(vs):10.1f} {min(vs):10.1f} {max(vs):10.1f} {razon:7.1f}x")
    print()

# Comparacion honesta: solo se puede concluir si los rangos NO se solapan.
for col in ('p95_ms', 'media_ms', 'throughput'):
    a, b = datos['pesimista'][col], datos['optimista'][col]
    if not a or not b: continue
    solapan = not (max(a) < min(b) or max(b) < min(a))
    veredicto = 'RANGOS SE SOLAPAN: no se puede concluir diferencia' if solapan \
        else ('mejor optimista' if st.median(b) < st.median(a) else 'mejor pesimista')
    if col == 'throughput' and not solapan:
        veredicto = 'mejor optimista' if st.median(b) > st.median(a) else 'mejor pesimista'
    print(f"{col:<12} pesimista {st.median(a):8.1f} | optimista {st.median(b):8.1f}  ->  {veredicto}")
PY
