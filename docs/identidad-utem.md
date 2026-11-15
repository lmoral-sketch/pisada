# Identidad visual UTEM aplicada al proyecto

Extracto operativo del **Manual de Identidad Visual UTEM 2026**, con lo que aplica a este
trabajo. Los manuales completos están en `material/identidad/`.

---

## Colores

### Institucionales (capítulo 4.1)

| Color | HEX | RGB | Pantone |
|---|---|---|---|
| Blanco | `#FFFFFF` | 255/255/255 | — |
| **Azul** | `#004EAA` | 0/78/170 | 2145 |
| **Verde** | `#78BF26` | 120/191/38 | 368 |

### Color de nuestra facultad (capítulo 4.2)

> **Facultad de Ingeniería** — `#00B6ED` · RGB 0/182/237 · PANTONE 306

El manual es explícito:

> *"Toda pieza visual que represente a una facultad o sus carreras debe usar de forma
> jerárquica y predominante el color asignado."*

Como el ramo pertenece al **Departamento de Informática y Computación**, de la Facultad de
Ingeniería, **el celeste `#00B6ED` debe predominar** en el informe y la presentación, con el
azul y el verde institucionales como apoyo.

---

## Tipografía (capítulo 5)

### Para documentos (uso ofimático, capítulo 5.3)

| Opción | Fuente | Tamaño | Alineación | Interlineado |
|---|---|---|---|---|
| **Preferente** | **Aptos** | 11 pt | Izquierda | 130 % (≈14 pt) |
| Alternativa | Montserrat | 10 pt | Izquierda | 150 % (≈15 pt) |

Aptos viene preinstalada en Windows y macOS con Microsoft Office. Montserrat está en Google
Fonts, gratis.

### Recomendadas en general (capítulo 5.2)

Aptos, Arial, Calibri, Kawak, Montserrat, Open Sans, Panton, Sánchez, Tahoma y Verdana.

Para medios digitales el manual recomienda declarar respaldos:

```css
font-family: Aptos, Montserrat, Arial, Helvetica, sans-serif;
```

---

## Qué se aplicó en el proyecto

| Pieza | Estado |
|---|---|
| **Gráficos del informe** | ✅ Regenerados con la paleta UTEM |
| **Portada del informe** | ✅ `docs/portada-informe.html` |
| **Plantilla de presentación** | ✅ `docs/presentacion.html` |
| **Logo** | ⬜ **Falta descargarlo** (ver abajo) |

### Los gráficos

Las cinco figuras usan ahora:

- Serie principal: **azul institucional** `#004EAA`
- Serie secundaria: **celeste de Ingeniería** `#00B6ED`
- Acento: **verde institucional** `#78BF26`
- Tipografía declarada: `Aptos, Montserrat, Arial, Helvetica, sans-serif`

---

## Pendiente: el logo

El logo viene **vectorial dentro de los PDF**, de modo que no se puede extraer como imagen
sin pérdida de calidad.

**Hay que descargarlo** desde la página oficial:

👉 https://www.utem.cl/universidad/presentacion/identidad/

Buscar el identificador institucional en **PNG con fondo transparente** o **SVG**, y guardarlo
como:

```
proyecto/docs/assets/logo-utem.png
```

La portada y la presentación ya lo referencian en esa ruta: apenas el archivo exista,
aparecerá solo.

### Reglas de uso del logo (capítulo 3 del manual)

- **No** alterar proporciones, colores ni tipografías del identificador
- Respetar el área de resguardo alrededor
- Sobre fondos oscuros, usar la versión en blanco

---

## Para la presentación del video

1. Abrir `docs/presentacion.html` en el navegador
2. Pasar las láminas con las flechas ← →
3. Compartir esa ventana en OBS como fondo

Ya trae los colores, la tipografía y la estructura de los ocho bloques del guion.
