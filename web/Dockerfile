# =============================================================================
# Pisada — Imagen de producción
# =============================================================================
#
# Construcción en varias etapas. El objetivo no es elegancia: es TAMAÑO.
# Una imagen de Next.js sin optimizar ronda 1,2 GB porque arrastra todo
# node_modules y las herramientas de compilación. Con `output: standalone` y
# etapas separadas baja a cerca de 200 MB.
#
# En un plan gratuito, con disco y memoria acotados, esa diferencia es la que
# permite desplegar. Además, una imagen chica arranca antes, lo que importa en
# proveedores que suspenden el servicio por inactividad.
# =============================================================================

# -----------------------------------------------------------------------------
# Etapa 1: dependencias
# -----------------------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Solo los manifiestos: así esta capa se reutiliza mientras las dependencias no
# cambien, aunque cambie el código.
COPY package.json package-lock.json ./
RUN npm ci

# -----------------------------------------------------------------------------
# Etapa 2: compilación
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Sin telemetría: no queremos tráfico de red ajeno al sistema que medimos.
ENV NEXT_TELEMETRY_DISABLED=1

# El identificador de GA4 se incrusta en el bundle del cliente durante la
# compilación, así que debe estar presente AQUÍ y no solo en ejecución. Es la
# razón por la que se declara como argumento de construcción.
ARG NEXT_PUBLIC_GA_ID
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

RUN npm run build

# -----------------------------------------------------------------------------
# Etapa 3: ejecución
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios: un proceso de aplicación no tiene por qué correr
# como root dentro del contenedor.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# La salida autónoma trae su propio servidor y solo las dependencias que usa.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Scripts de base de datos, para poder sembrar el catálogo en el entorno
# desplegado sin necesidad de una imagen aparte.
COPY --from=builder --chown=nextjs:nodejs /app/db ./db
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg ./node_modules/pg
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-array ./node_modules/postgres-array
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-bytea ./node_modules/postgres-bytea
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-date ./node_modules/postgres-date
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/postgres-interval ./node_modules/postgres-interval
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/split2 ./node_modules/split2

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
