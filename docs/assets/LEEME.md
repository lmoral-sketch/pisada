# Logo institucional

Falta **`logo-utem.png`** en esta carpeta.

El logo viene vectorial dentro de los PDF del manual, así que no se puede extraer
como imagen sin perder calidad. Hay que descargarlo de la página oficial:

👉 https://www.utem.cl/universidad/presentacion/identidad/

Guardarlo como `logo-utem.png`, idealmente PNG con fondo transparente.

`portada-informe.html` y `presentacion.html` ya lo referencian: apenas el archivo
exista, reemplazar el bloque `.logo-marcador` / `.logo-falta` por:

```html
<img src="assets/logo-utem.png" alt="Universidad Tecnológica Metropolitana">
```

**Reglas del manual (capítulo 3):** no alterar proporciones, colores ni tipografías
del identificador; respetar el área de resguardo; sobre fondos oscuros usar la
versión en blanco.
