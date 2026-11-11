# Guía de GA4 y despliegue

Pasos que requieren **cuentas propias** y por lo tanto los hace el equipo, no el agente.
Todo lo técnico (Dockerfile, `render.yaml`, variables) ya está preparado y verificado.

**Estado:** la imagen Docker construye (323 MB), el contenedor arranca en 120 ms y sirve
todas las rutas contra PostgreSQL. Falta solo conectar las cuentas.

---

## Parte 1 — Google Analytics 4

> Hacer esto **primero**. GA4 necesita días acumulando tráfico para que las métricas de
> engagement (tasa de rebote, duración de sesión, páginas por sesión) tengan datos. Si se
> deja para el final, el informe mostrará capturas de un panel vacío.

### 1.1 Crear la propiedad

1. Entrar a <https://analytics.google.com> con una cuenta de Google.
2. **Administrar** (engranaje, abajo a la izquierda) → **Crear** → **Propiedad**.
3. Nombre de la propiedad: `Pisada`.
4. Zona horaria: **Chile**. Moneda: **Peso chileno (CLP)**.
5. Categoría del sector: *Compras*. Tamaño: el más chico.
6. Objetivos: marcar **Examinar el comportamiento de los usuarios**.
7. Plataforma: **Web**.
8. URL del sitio web: la que entregue Render (ver Parte 3). Si aún no existe, poner
   `https://pisada.onrender.com` y corregirla después.
9. Nombre del flujo: `Pisada web`.

### 1.2 Obtener el identificador de medición

Al terminar aparece un **ID de medición** con el formato `G-XXXXXXXXXX`.

Ese valor va en la variable `NEXT_PUBLIC_GA_ID`. Para probar en local, agregarlo a
`web/.env`:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

> El código ya está escrito: si la variable está vacía, GA4 **no se carga**. Eso es
> deliberado, para que el tráfico sintético de k6 no contamine la propiedad.

### 1.3 Verificar que la medición mejorada esté activa

En **Administrar** → **Flujos de datos** → el flujo creado → **Medición mejorada**,
confirmar que esté encendida. De ahí salen las métricas de engagement que pide la Fase 2.

### 1.4 Dar acceso al profesor

**Requisito explícito del enunciado.**

1. **Administrar** → **Gestión de accesos a la propiedad**.
2. Botón **+** → **Agregar usuarios**.
3. Correo: **`j.aranda@utem.cl`**
4. Rol: **Analista** (basta para ver informes; no permite modificar la configuración).
5. Marcar *Notificar por correo electrónico*.
6. **Agregar**.

> Hacer esto apenas exista la propiedad, no al final.

### 1.5 Comprobar los eventos

Con el sitio desplegado y navegando desde un navegador real:

**Administrar** → **DebugView**, o **Informes** → **Tiempo real**.

Deben aparecer, en este orden al recorrer el embudo:

| Evento | Cuándo se dispara |
|---|---|
| `view_item` | Al abrir una ficha de producto |
| `add_to_cart` | Al agregar una talla al carrito |
| `begin_checkout` | Al pulsar *Pagar* |
| `purchase` | Al confirmarse la compra |
| `compra_sin_stock` | Si el pago se rechaza por falta de stock |

El último no es estándar de GA4: lo agregamos para explicar el punto de fuga del embudo
bajo carga. Sin él, en el informe se vería una caída de conversión sin causa aparente.

---

## Parte 2 — Base de datos en la nube

El contenedor de PostgreSQL local no es accesible desde internet, así que el despliegue
necesita una base propia.

### Opción recomendada: Neon

1. <https://neon.tech> → registrarse (sirve la cuenta de GitHub).
2. **Create project**. Nombre: `pisada`. Región: la más cercana (*US East* o *US West*).
3. Copiar la **cadena de conexión** del panel. Tiene esta forma:
   ```
   postgresql://usuario:clave@ep-algo-123456.us-east-2.aws.neon.tech/pisada?sslmode=require
   ```
4. Guardarla: es el valor de `DATABASE_URL` en Render.

> El plan gratuito de Neon da 0,5 GB, de sobra para nuestro catálogo.

### Sembrar el catálogo en la nube

Desde el equipo local, apuntando a la base remota:

```bash
cd web && DATABASE_URL="<cadena de Neon>" node db/semilla.mjs
```

Esto aplica el esquema y genera los 240 productos con sus 4552 variantes.

> **Importante:** usar la misma semilla aleatoria (ya está fija en el código) para que el
> catálogo en la nube sea **idéntico** al local. Si fueran distintos, las mediciones de
> ambos entornos no serían comparables.

---

## Parte 3 — Despliegue en Render

### 3.1 Subir el repositorio a GitHub

El repositorio local todavía no tiene remoto. Crear uno en GitHub (privado está bien,
siempre que se comparta con el profesor) y:

```bash
cd proyecto
git remote add origin https://github.com/<usuario>/pisada.git
git push -u origin master
```

### 3.2 Crear el servicio

1. <https://render.com> → registrarse con GitHub.
2. **New** → **Web Service** → conectar el repositorio.
3. ⚠️ **Render solo lee `render.yaml` si el servicio se crea como Blueprint.** Creado desde
   *New → Web Service*, ese archivo se ignora y hay que fijar a mano, en
   *Settings → Build & Deploy*, el campo **Root Directory** en `web`.
   Verificar que quede:
   - Runtime: **Docker**
   - Dockerfile path: `./web/Dockerfile`
   - Docker context: `./web`
   - Plan: **Free**

### 3.3 Variables de entorno

En **Environment**, agregar:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La cadena de Neon |
| `NEXT_PUBLIC_GA_ID` | El `G-XXXXXXXXXX` de GA4 |
| `PG_POOL_MAX` | `5` |
| `ESTRATEGIA_STOCK` | `pesimista` |

> `NEXT_PUBLIC_GA_ID` se incrusta en el bundle del cliente **durante la compilación**, no en
> ejecución. Si se agrega después de desplegar, hay que forzar un nuevo despliegue para que
> tenga efecto.

### 3.4 Desplegar

**Create Web Service**. La primera construcción toma entre 5 y 10 minutos.

La URL queda como `https://pisada.onrender.com` (o con un sufijo si el nombre está tomado).
Ese es el valor que debe ir en el flujo de datos de GA4.

---

## Advertencias para las mediciones en la nube

Estas tres cosas pueden arruinar los datos del informe si no se tienen en cuenta.

### Dos servicios se suspenden, no uno

El plan gratuito de Render **apaga el servicio tras 15 minutos sin tráfico** y tarda cerca de
un minuto en reactivarse. El plan gratuito de Neon hace lo mismo con la base: la **suspende
tras 5 minutos de inactividad** y tarda unos 500 ms en despertar.

Antes de cualquier corrida de k6 hay que despertar **ambos**:

```bash
curl https://pisada.onrender.com/catalogo
```

Se usa `/catalogo` y no `/` a propósito: esa página consulta la base, de modo que una sola
petición despierta el servicio **y** el compute de Neon. Esperar a que responda con normalidad
(repetir hasta que el tiempo baje a lo habitual) y recién entonces lanzar la prueba.

Si no, las primeras peticiones medirán dos arranques en frío encadenados y los percentiles
saldrán inservibles.

### La región de la base debe coincidir con la de la aplicación

La latencia entre aplicación y base se paga **en cada consulta**, no una vez por página. La
página de catálogo ejecuta tres consultas: con la base en São Paulo y la aplicación en
Oregon, serían unos 600 ms de pura red por página.

Por eso ambas quedan en **us-east-2 (Ohio)**. La latencia Chile → Estados Unidos sigue
existiendo, pero se paga una sola vez por página y se trata como lo que es: **una estación de
servicio más** en la ley general del tiempo de respuesta, medida y declarada por separado.

> Consecuencia práctica observada: sembrar el catálogo contra Neon con inserciones de a una
> tomaba **11 minutos**, frente a 8 segundos en local, porque cada una de las 4552
> inserciones era un viaje de ida y vuelta. Se agruparon por producto, bajando de 4552
> viajes a 240.

### Los recursos son muy acotados

El plan gratuito entrega **0,1 CPU y 512 MB**, bastante menos que el 1 CPU del contenedor
local. Consecuencias:

- El punto de saturación aparecerá con **mucha menos carga** que en local.
- Los escalones de `pico.js` (hasta 350 VU) probablemente sean excesivos. Conviene una
  corrida exploratoria con 10, 25 y 50 VU antes de decidir la escala.

**Esto no es un problema, es una ventaja.** El informe puede comparar el mismo sistema bajo
dos configuraciones de recursos distintas y mostrar cómo se desplaza el punto de saturación.
Es exactamente el análisis de sensibilidad que describe la Cátedra 1.1.

### La latencia de red entra en la medición

Render está en Estados Unidos. Desde Chile se suman entre 100 y 200 ms de ida y vuelta a
**cada** petición. Eso significa que los tiempos de la nube **no son comparables** con los
locales sin descontar ese componente.

Conviene medir la latencia base y dejarla registrada en el informe:

```bash
curl -s -o /dev/null -w 'latencia: %{time_connect}s\n' https://pisada.onrender.com/
```

Por la **ley general del tiempo de respuesta**, el tiempo total es la suma ponderada de los
tiempos de cada estación: la red es una estación más, y hay que nombrarla como tal en lugar
de atribuir su costo a la aplicación.

---

## Lista de verificación

- [ ] Propiedad de GA4 creada, con zona horaria Chile y moneda CLP
- [ ] Medición mejorada activada
- [ ] **`j.aranda@utem.cl` con acceso de Analista**
- [ ] `NEXT_PUBLIC_GA_ID` anotado
- [ ] Base en Neon creada y cadena de conexión guardada
- [ ] Catálogo sembrado en la nube
- [ ] Repositorio subido a GitHub y compartido con el profesor
- [ ] Servicio de Render creado con las cuatro variables
- [ ] Sitio accesible desde internet
- [ ] URL del sitio corregida en el flujo de datos de GA4
- [ ] Los cinco eventos verificados en DebugView
- [ ] Latencia de red base medida y anotada
