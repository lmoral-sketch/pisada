# Plan de entrega — LAB1, lunes 16 de noviembre

Quedan **5 días**. Este documento lista lo que falta, en orden, con el paso a paso de cada
punto. Marca las casillas a medida que avances.

**Leyenda:** 👤 lo hace el equipo · 🤖 lo hace el agente · 👥 requiere a todo el grupo

---

## Calendario sugerido

| Día | Qué |
|---|---|
| **Mar 11** | Puntos 1 y 2 (GitHub y Render). Agendar la grabación del video |
| **Mié 12** | Punto 3 (protocolo GA4). El agente corre las repeticiones de contención |
| **Jue 13** | Punto 4: completar el informe con los datos reales |
| **Vie 14** | Punto 5: grabar el video |
| **Sáb 15** | Punto 6: revisión final y margen para imprevistos |
| **Lun 16** | Entrega |

> El video es lo que más se atrasa porque depende de juntar gente. **Agenda la grabación hoy.**

---

## Punto 1 — Subir el código a GitHub 👤

*5 minutos. Bloquea el punto 2.*

### 1.1 Crear el repositorio

1. Entrar a **https://github.com/new**
2. **Repository name:** `pisada`
3. **Description:** `Trabajo semestral INFB8091 Desempeño de Sistemas - UTEM 2026-2`
4. Elegir **Public** (recomendado: evita tener que agregar al profesor como colaborador)
5. ⚠️ **NO marcar** ninguna de las tres casillas: *Add a README file*, *Add .gitignore*,
   *Choose a license*. El repositorio debe quedar **completamente vacío**.
6. **Create repository**

### 1.2 Copiar la URL

En la pantalla que aparece, copiar la dirección del recuadro *Quick setup*. Tiene esta forma:

```
https://github.com/TUUSUARIO/pisada.git
```

### 1.3 Pasársela al agente 🤖

El agente ejecuta:

```bash
git remote add origin <URL>
git push -u origin master
```

Si GitHub pide autenticación, abre el navegador para autorizar. Completarla ahí.

- [ ] Repositorio creado
- [ ] URL entregada al agente
- [ ] 15 commits subidos

---

## Punto 2 — Desplegar en Render 👤 + 🤖

*15 minutos de configuración, 10 de espera. Bloquea el punto 3.*

### 2.1 Crear la cuenta y el servicio

1. **https://render.com** → **Get Started** → *Sign in with GitHub*
2. Autorizar a Render el acceso a los repositorios
3. En el panel: **New +** → **Web Service**
4. Buscar **pisada** en la lista → **Connect**
5. Render detecta `render.yaml`. Verificar que muestre:
   - Language: **Docker**
   - Branch: **master**
   - Region: **Ohio**
   - Instance Type: **Free**

### 2.2 Variables de entorno

Bajar hasta **Environment Variables** y agregar estas cuatro:

| Key | Value |
|---|---|
| `DATABASE_URL` | la cadena de Neon (está en `web/.env.neon`) |
| `NEXT_PUBLIC_GA_ID` | `G-P8EWE6D7G3` |
| `PG_POOL_MAX` | `5` |
| `ESTRATEGIA_STOCK` | `pesimista` |

> ⚠️ `NEXT_PUBLIC_GA_ID` se incrusta **durante la compilación**. Si se agrega después del
> primer despliegue, hay que forzar un nuevo despliegue (*Manual Deploy → Clear build cache
> and deploy*) para que tenga efecto.

### 2.3 Desplegar

1. **Create Web Service**
2. Esperar entre 5 y 10 minutos mirando los registros
3. Cuando el estado diga **Live**, copiar la URL de arriba:
   `https://pisada.onrender.com` o similar
4. Pasársela al agente

### 2.4 Verificar 🤖

El agente comprueba que el sitio responda, que el catálogo cargue desde Neon y que la
etiqueta de GA4 esté presente.

### 2.5 Corregir la URL en GA4 👤

Solo si la URL difiere de `https://pisada.onrender.com`:

1. Analytics → **Administrar** → **Flujos de datos** → *Pisada web*
2. Lápiz ✏️ → corregir la URL → **Guardar**

- [ ] Servicio creado con las cuatro variables
- [ ] Estado **Live**
- [ ] URL entregada al agente y verificada
- [ ] URL corregida en GA4

---

## Punto 3 — Datos de GA4: el protocolo de dos sesiones 👥

*Una hora. Necesita al menos dos personas. Es el dato que falta para la Fase 2.*

### Por qué este protocolo

**k6 no ejecuta JavaScript**, así que su tráfico **no genera eventos en GA4**. La Fase 2 pide
comparar la experiencia de usuario en condiciones normales frente a bajo carga, y esa
comparación solo sale si **personas reales navegan mientras k6 carga el servidor**.

### 3.1 Preparar

```bash
curl https://pisada.onrender.com/catalogo
```

Repetir hasta que responda rápido: despierta el servicio de Render **y** el compute de Neon,
que se suspenden por inactividad. Sin esto, las primeras mediciones serán arranques en frío.

### 3.2 Sesión de CONTROL (sin carga)

Anotar la hora de inicio. Cada integrante, desde su propio equipo y navegador:

1. Abrir `https://pisada.onrender.com`
2. Ir al catálogo
3. Aplicar un filtro (categoría o talla)
4. Abrir una ficha de producto
5. Elegir una talla y agregar al carrito
6. Ir al carrito y pagar
7. Repetir el recorrido completo **3 veces**, con ritmo normal

Anotar la hora de término. **Duración objetivo: 15 minutos.**

### 3.3 Sesión BAJO CARGA

1. Anotar la hora de inicio
2. **Lanzar k6** (lo hace el agente, o el equipo con este comando):
   ```bash
   k6 run -e BASE_URL=https://pisada.onrender.com carga/escenarios/pico.js
   ```
3. **Mientras k6 corre**, los mismos integrantes repiten **exactamente el mismo recorrido**,
   otras 3 veces cada uno
4. Anotar la hora de término

> ⚠️ Render free entrega 0,1 CPU, mucho menos que el contenedor local. Los escalones hasta
> 350 usuarios de `pico.js` probablemente sean excesivos. Conviene una corrida exploratoria
> previa con 10, 25 y 50 usuarios para calibrar.

### 3.4 Recolectar en GA4

Al día siguiente (GA4 demora en consolidar los informes):

1. **Informes** → **Interacción** → **Páginas y pantallas**
2. Ajustar el rango de fechas y comparar las dos franjas horarias
3. Capturar:
   - Core Web Vitals
   - Tasa de rebote
   - Duración media de la sesión
   - Páginas por sesión
   - **Embudo de conversión**: Informes → Monetización → Comercio electrónico

4. Entregar las capturas y las cifras al agente

- [ ] Servicios despertados
- [ ] Sesión de control hecha, con horas anotadas
- [ ] Sesión bajo carga hecha, con horas anotadas
- [ ] Capturas de GA4 obtenidas

---

## Punto 4 — Completar el informe 🤖 + 👤

*El agente lo redacta; el equipo aporta los datos que solo ellos tienen.*

### Lo que el agente necesita del equipo 👤

1. **Nombres completos y RUT** de los integrantes
2. Las **capturas y cifras de GA4** del punto 3
3. La **URL del sitio** y la del repositorio

### Lo que hace el agente 🤖

- Rellena las secciones marcadas *(pendiente)* en `docs/informe-fase1.md`
- Agrega la sección 5.6 con los indicadores de experiencia de usuario
- Repite el experimento de contención 5 veces por configuración, para que la comparación
  entre estrategias tenga poder estadístico
- Genera los gráficos de las curvas de utilización y tiempo de respuesta
- Exporta el informe a PDF con el formato de la UTEM

- [ ] Datos de los integrantes entregados
- [ ] Datos de GA4 entregados
- [ ] Informe completo revisado por el equipo

---

## Punto 5 — Grabar el video 👥

*El enunciado es explícito en sus requisitos. Agendarlo ya.*

### Requisitos del enunciado

- **Deben participar TODOS los integrantes**
- Pueden grabarse **en distintos momentos** y unir los fragmentos después
- Quien presenta debe estar **visible, de frente a la cámara, en una ventana**
- La **presentación va de fondo**

### 5.1 Preparar la presentación

Usar el **Manual de Identidad Visual de UTEM** (exigido en las referencias del enunciado).

Guion sugerido, entre 8 y 12 minutos:

| Minuto | Contenido | Quién |
|---|---|---|
| 0-1 | Presentación del equipo y del comercio | Integrante A |
| 1-3 | Arquitectura y por qué el inventario a nivel de SKU es el eje | Integrante A |
| 3-5 | Demostración del sitio: catálogo, filtros, compra | Integrante B |
| 5-6 | GA4: eventos y embudo | Integrante B |
| 6-8 | Generadores de carga y el modelo CBMG | Integrante C |
| 8-10 | Resultados: curva de utilización, leyes verificadas, Amdahl | Integrante C |
| 10-12 | Cuellos de botella, propuestas de mejora y conclusiones | Todos |

### 5.2 Grabar

Herramientas: **OBS Studio** (gratuito) o **Zoom** grabando una reunión. Ambos permiten
mostrar la pantalla con la cámara en una ventana, que es justo lo que pide el enunciado.

### 5.3 Editar y unir

Si se grabó por partes: **Clipchamp** (viene en Windows) o **DaVinci Resolve** (gratuito).

### 5.4 Entregar

Subir a YouTube **como no listado** o a Google Drive con permiso de lectura, y entregar el
enlace.

- [ ] Fecha de grabación agendada
- [ ] Presentación lista
- [ ] Todos los fragmentos grabados
- [ ] Video editado y subido

---

## Punto 6 — Revisión final 👥

*El sábado 15, con margen para corregir.*

Checklist contra los entregables que exige el enunciado:

- [ ] **Código fuente** del sitio y de los generadores, accesible en el repositorio
- [ ] **Configuración de GA4 documentada**: capturas del panel y de los eventos configurados
- [ ] **`j.aranda@utem.cl` con acceso a la propiedad de GA4** ✅ *(ya hecho)*
- [ ] **Resultados de las pruebas de carga**: reportes de k6 en `carga/resultados/`
- [ ] **Informe técnico** con arquitectura, metodología, resultados con gráficos, análisis de
      cuellos de botella, propuestas de mejora y conclusiones
- [ ] **Video** con todos los integrantes
- [ ] **Registro de prompts** ✅ *(`logs/prompts.md`, al día)*
- [ ] Manual de Identidad Visual de UTEM aplicado en informe y presentación

---

## Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| El video se atrasa porque no se junta el grupo | **Agendar hoy**; se puede grabar por partes |
| Render tarda más de lo previsto en el primer despliegue | Hacerlo hoy, no el viernes |
| GA4 no muestra datos suficientes | Hacer el punto 3 el miércoles, no el domingo |
| Render free resulta demasiado limitado para `pico.js` | Corrida exploratoria previa para calibrar |
| El sitio se suspende y contamina las mediciones | Despertar con `curl` antes de cada corrida |
