#!/usr/bin/env python
"""
Genera los gráficos del informe como SVG, sin dependencias externas.

Se eligió SVG escrito a mano en vez de una librería de graficación por dos
razones: el archivo es texto, de modo que se versiona y se revisa en Git como
cualquier otro fuente, y escala sin perder nitidez al insertarlo en el informe.

Uso:
    python carga/graficar.py
Salida:
    docs/graficos/*.svg
"""

import os

SALIDA = os.path.join(os.path.dirname(__file__), '..', 'docs', 'graficos')

# Paleta del Manual de Identidad Visual de UTEM (2026).
#
# El manual asigna un color propio a cada facultad y establece que "toda pieza
# visual que represente a una facultad o sus carreras debe usar de forma
# jerárquica y predominante el color asignado". Por eso el celeste de la
# Facultad de Ingeniería es la serie principal.
TINTA = '#1a1a1a'
SUAVE = '#8a8a8a'
REJILLA = '#e0e0e0'

AZUL_UTEM = '#004EAA'      # institucional, PANTONE 2145
VERDE_UTEM = '#78BF26'     # institucional, PANTONE 368
CELESTE_ING = '#00B6ED'    # Facultad de Ingeniería, PANTONE 306

SERIE_A = AZUL_UTEM
SERIE_B = CELESTE_ING
ACENTO = VERDE_UTEM


def escapar(t):
    return str(t).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def lienzo(ancho, alto, titulo, subtitulo=''):
    """Devuelve la cabecera del SVG con título y subtítulo."""
    s = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" '
        f'width="{ancho}" height="{alto}" font-family="Aptos, Montserrat, Arial, Helvetica, sans-serif">',
        f'<rect width="{ancho}" height="{alto}" fill="#ffffff"/>',
        f'<text x="24" y="30" font-size="16" font-weight="600" fill="{TINTA}">{escapar(titulo)}</text>',
    ]
    if subtitulo:
        s.append(f'<text x="24" y="50" font-size="11" fill="{SUAVE}">{escapar(subtitulo)}</text>')
    return s


def ejes(s, x0, y0, ancho, alto, ymax, etiquetas_x, titulo_y, pasos_y=5):
    """Dibuja la rejilla horizontal, el eje Y y las etiquetas del eje X."""
    for i in range(pasos_y + 1):
        y = y0 + alto - (alto * i / pasos_y)
        valor = ymax * i / pasos_y
        s.append(f'<line x1="{x0}" y1="{y:.1f}" x2="{x0+ancho}" y2="{y:.1f}" '
                 f'stroke="{REJILLA}" stroke-width="1"/>')
        texto = f'{valor:.0f}' if ymax >= 10 else f'{valor:.1f}'
        s.append(f'<text x="{x0-8}" y="{y+4:.1f}" font-size="10" fill="{SUAVE}" '
                 f'text-anchor="end">{texto}</text>')

    s.append(f'<text x="{x0-44}" y="{y0+alto/2:.0f}" font-size="10" fill="{SUAVE}" '
             f'text-anchor="middle" transform="rotate(-90 {x0-44} {y0+alto/2:.0f})">'
             f'{escapar(titulo_y)}</text>')

    paso = ancho / max(len(etiquetas_x) - 1, 1)
    for i, et in enumerate(etiquetas_x):
        x = x0 + i * paso
        s.append(f'<text x="{x:.1f}" y="{y0+alto+18:.0f}" font-size="10" fill="{SUAVE}" '
                 f'text-anchor="middle">{escapar(et)}</text>')


def serie(s, x0, y0, ancho, alto, ymax, valores, color, etiqueta_valores=True):
    """Dibuja una línea con sus puntos."""
    paso = ancho / max(len(valores) - 1, 1)
    puntos = []
    for i, v in enumerate(valores):
        x = x0 + i * paso
        y = y0 + alto - (alto * v / ymax)
        puntos.append((x, y, v))

    d = ' '.join(f'{"M" if i == 0 else "L"} {x:.1f} {y:.1f}' for i, (x, y, _) in enumerate(puntos))
    s.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="2.5"/>')

    for x, y, v in puntos:
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="4" fill="#ffffff" '
                 f'stroke="{color}" stroke-width="2.5"/>')
        if etiqueta_valores:
            txt = f'{v:.1f}' if v < 100 else f'{v:.0f}'
            s.append(f'<text x="{x:.1f}" y="{y-12:.1f}" font-size="10" font-weight="600" '
                     f'fill="{color}" text-anchor="middle">{txt}</text>')


def leyenda(s, x, y, entradas):
    """Dibuja una leyenda horizontal."""
    dx = 0
    for color, texto in entradas:
        s.append(f'<rect x="{x+dx}" y="{y-9}" width="14" height="3" fill="{color}"/>')
        s.append(f'<text x="{x+dx+20}" y="{y}" font-size="11" fill="{TINTA}">{escapar(texto)}</text>')
        dx += 26 + len(texto) * 6.2
    return dx


def guardar(nombre, lineas):
    os.makedirs(SALIDA, exist_ok=True)
    ruta = os.path.join(SALIDA, nombre)
    lineas.append('</svg>')
    with open(ruta, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lineas))
    print(f'  {nombre}')


# ---------------------------------------------------------------------------
# Gráfico 1 — Curva de utilización de CPU
# ---------------------------------------------------------------------------

def grafico_utilizacion():
    vu = [25, 50, 100, 200, 350]
    cpu = [10.4, 17.8, 31.8, 61.3, 96.6]

    s = lienzo(680, 380,
               'Utilizacion de CPU frente a usuarios concurrentes',
               'Escenario de pico, escalones de 2 minutos. Contenedor con 1 CPU y 512 MB.')
    x0, y0, an, al = 70, 78, 560, 240
    ejes(s, x0, y0, an, al, 100, [str(v) for v in vu], 'Utilizacion de CPU (%)')
    serie(s, x0, y0, an, al, 100, cpu, SERIE_A)

    # Proyección del punto de saturación.
    s.append(f'<line x1="{x0}" y1="{y0}" x2="{x0+an}" y2="{y0}" stroke="{SERIE_B}" '
             f'stroke-width="1.5" stroke-dasharray="5 4"/>')
    s.append(f'<text x="{x0+an-4}" y="{y0-6}" font-size="10" fill="{SERIE_B}" '
             f'text-anchor="end">saturacion (100%) — ALCANZADA a 350 VU</text>')

    s.append(f'<text x="{x0+an/2:.0f}" y="{y0+al+40:.0f}" font-size="10" fill="{SUAVE}" '
             f'text-anchor="middle">usuarios virtuales concurrentes</text>')
    guardar('utilizacion-cpu.svg', s)


# ---------------------------------------------------------------------------
# Gráfico 2 — CPU por usuario: la firma del encolamiento
# ---------------------------------------------------------------------------

def grafico_cpu_por_usuario():
    vu = [25, 50, 100, 200, 350]
    por_usuario = [0.416, 0.356, 0.318, 0.307, 0.276]

    s = lienzo(680, 380,
               'CPU consumida POR usuario frente a usuarios concurrentes',
               'Decrece de forma sostenida: cada usuario pasa mas tiempo esperando que siendo atendido.')
    x0, y0, an, al = 70, 78, 560, 240
    ejes(s, x0, y0, an, al, 0.4, [str(v) for v in vu], 'CPU por usuario (%)')
    serie(s, x0, y0, an, al, 0.4, por_usuario, ACENTO)

    s.append(f'<text x="{x0+an/2:.0f}" y="{y0+al+40:.0f}" font-size="10" fill="{SUAVE}" '
             f'text-anchor="middle">usuarios virtuales concurrentes</text>')
    s.append(f'<text x="{x0+12}" y="{y0+al-18}" font-size="11" fill="{TINTA}">'
             f'Es la firma del encolamiento, y aparece ANTES de que la latencia se degrade.</text>')
    guardar('cpu-por-usuario.svg', s)


# ---------------------------------------------------------------------------
# Gráfico 3 — Percentiles por escenario
# ---------------------------------------------------------------------------

def grafico_percentiles():
    escenarios = ['Baja\n5 VU', 'Normal\n25 VU', 'Pico\n350 VU']
    p95 = [54.03, 35.30, 1560.0]
    p99 = [118.61, 48.34, 2330.0]

    s = lienzo(680, 380,
               'Percentiles de tiempo de respuesta por escenario',
               'Escala logaritmica no usada: el pico supera al resto en mas de un orden de magnitud.')
    x0, y0, an, al = 70, 78, 560, 240
    ymax = 2500
    ejes(s, x0, y0, an, al, ymax, ['Baja (5)', 'Normal (25)', 'Pico (350)'],
         'Tiempo de respuesta (ms)')

    # Barras agrupadas.
    paso = an / len(escenarios)
    ancho_barra = 46
    for i, (a, b) in enumerate(zip(p95, p99)):
        cx = x0 + paso * i + paso / 2
        for j, (valor, color, etiqueta) in enumerate(((a, SERIE_A, 'p95'), (b, SERIE_B, 'p99'))):
            h = al * valor / ymax
            x = cx - ancho_barra + j * (ancho_barra + 4)
            y = y0 + al - h
            s.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{ancho_barra}" height="{h:.1f}" '
                     f'fill="{color}" rx="2"/>')
            s.append(f'<text x="{x+ancho_barra/2:.1f}" y="{y-6:.1f}" font-size="10" '
                     f'font-weight="600" fill="{color}" text-anchor="middle">{valor:.0f}</text>')

    leyenda(s, x0, y0 + al + 44, [(SERIE_A, 'p(95)'), (SERIE_B, 'p(99)')])
    guardar('percentiles-escenarios.svg', s)


# ---------------------------------------------------------------------------
# Gráfico 4 — El techo de Amdahl se desploma con la contención
# ---------------------------------------------------------------------------

def grafico_amdahl():
    casos = ['Carga normal\nSKU al azar', 'Contencion\npesimista', 'Contencion\noptimista']
    fraccion = [7.2, 12.8, 21.2]
    techo = [13.9, 7.8, 4.7]

    s = lienzo(680, 400,
               'Ley de Amdahl: el techo de mejora cae al subir la contencion',
               'A mayor fraccion serializada, menor es la mejora alcanzable por mas CPU.')
    x0, y0, an, al = 70, 78, 560, 240
    ejes(s, x0, y0, an, al, 24, ['normal', 'pesimista', 'optimista'],
         'Fraccion serializada (%)')

    paso = an / len(casos)
    for i, (f, t) in enumerate(zip(fraccion, techo)):
        cx = x0 + paso * i + paso / 2
        h = al * f / 24
        y = y0 + al - h
        s.append(f'<rect x="{cx-40:.1f}" y="{y:.1f}" width="80" height="{h:.1f}" '
                 f'fill="{SERIE_A}" rx="2"/>')
        s.append(f'<text x="{cx:.1f}" y="{y-22:.1f}" font-size="13" font-weight="700" '
                 f'fill="{SERIE_B}" text-anchor="middle">techo {t}x</text>')
        s.append(f'<text x="{cx:.1f}" y="{y-6:.1f}" font-size="10" fill="{TINTA}" '
                 f'text-anchor="middle">{f}% serializado</text>')

    s.append(f'<text x="{x0+an/2:.0f}" y="{y0+al+42:.0f}" font-size="10" fill="{SUAVE}" '
             f'text-anchor="middle">escenario</text>')
    s.append(f'<text x="24" y="382" font-size="10" fill="{SUAVE}">'
             f'A = 1 / [(1 - f) + f/k]   con k tendiendo a infinito:   A_max = 1 / fraccion serializada</text>')
    guardar('techo-amdahl.svg', s)


# ---------------------------------------------------------------------------
# Gráfico 5 — De que esta hecho el tiempo que percibe el usuario
# ---------------------------------------------------------------------------

def grafico_descomposicion():
    s = lienzo(680, 300,
               'De que esta hecho el tiempo de respuesta, medido desde Chile',
               'Pagina de catalogo en produccion. Aplicacion y base en Ohio.')

    x0, y = 70, 110
    an_total = 560
    total = 348.0
    partes = [
        (41, SERIE_A, 'Servidor (aplicacion + base)', '41 ms'),
        (307, SUAVE, 'Red (Chile - Ohio)', '307 ms'),
    ]

    dx = 0
    for valor, color, _, etiqueta in partes:
        w = an_total * valor / total
        s.append(f'<rect x="{x0+dx:.1f}" y="{y}" width="{w:.1f}" height="54" fill="{color}" rx="2"/>')
        if w > 60:
            s.append(f'<text x="{x0+dx+w/2:.1f}" y="{y+33}" font-size="13" font-weight="600" '
                     f'fill="#ffffff" text-anchor="middle">{etiqueta}</text>')
        dx += w

    s.append(f'<text x="{x0}" y="{y-12}" font-size="11" fill="{TINTA}">'
             f'TTFB total: 348 ms</text>')
    leyenda(s, x0, y + 92, [(SERIE_A, 'Servidor: 12%'), (SUAVE, 'Red: 88%')])
    s.append(f'<text x="24" y="250" font-size="11" fill="{TINTA}">'
             f'Por la ley general del tiempo de respuesta, la red es una estacion de servicio mas:</text>')
    s.append(f'<text x="24" y="268" font-size="11" fill="{TINTA}">'
             f'se declara por separado y no se atribuye a la aplicacion.</text>')
    guardar('descomposicion-tiempo.svg', s)


if __name__ == '__main__':
    print('Generando graficos en docs/graficos/:')
    grafico_utilizacion()
    grafico_cpu_por_usuario()
    grafico_percentiles()
    grafico_amdahl()
    grafico_descomposicion()
    print('Listo.')
