/**
 * Home.
 *
 * Página deliberadamente LIVIANA (regla 11 de AGENTS.md) en términos de
 * CONSULTAS: ejecuta una sola, acotada a los destacados. Todo el resto de la
 * página —portada, tiles de categoría, franja de beneficios, marcas— es
 * marcado estático y CSS, sin acceso a base de datos ni peticiones de red.
 *
 * Esa distinción importa para el trabajo: la página se ve rica pero su costo
 * de servidor sigue siendo el de una consulta, lo que la mantiene como línea
 * base válida frente al catálogo.
 */

import Link from 'next/link';
import { obtenerDestacados } from '@/lib/catalogo';
import { medirPagina } from '@/lib/instrumentar';
import { TarjetaProducto } from '@/components/tarjeta-producto';
import { IlustracionProducto } from '@/components/ilustraciones';

export const dynamic = 'force-dynamic';

/** Categorías destacadas en los tiles de la portada. */
const CATEGORIAS = [
  { slug: 'zapatillas-running', nombre: 'Running', hex: '#00B6ED' },
  { slug: 'zapatillas-trail', nombre: 'Trail', hex: '#78BF26' },
  { slug: 'zapatillas-urbanas', nombre: 'Urbanas', hex: '#004EAA' },
  { slug: 'polerones', nombre: 'Polerones', hex: '#712F91' },
  { slug: 'chaquetas', nombre: 'Chaquetas', hex: '#9E2339' },
  { slug: 'pantalones', nombre: 'Pantalones', hex: '#FF8204' },
];

const BENEFICIOS = [
  { titulo: 'Envío en 24 horas', detalle: 'Región Metropolitana' },
  { titulo: 'Hasta 6 cuotas', detalle: 'Sin interés con Webpay' },
  { titulo: 'Cambios gratis', detalle: '30 días desde la compra' },
  { titulo: 'Retiro en tienda', detalle: 'Sin costo adicional' },
];

export default async function Home() {
  const destacados = await medirPagina('/', () => obtenerDestacados(8));

  return (
    <div className="flex flex-col gap-14">
      {/* ── Portada ─────────────────────────────────────────────────── */}
      <section className="relative -mx-4 overflow-hidden bg-neutral-950 px-6 py-16 text-white sm:mx-0 sm:rounded-3xl sm:px-14 sm:py-24">
        {/* Halos de color. Puro CSS: no agregan peticiones de red. */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #00B6ED66, transparent 70%)' }} />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #78BF2644, transparent 70%)' }} />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#78BF26]" />
              Nueva temporada 2026
            </span>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Zapatillas que
              <br />
              <span className="text-[#00B6ED]">aguantan</span> el día
              <br />
              completo
            </h1>

            <p className="mt-6 max-w-md text-base leading-relaxed text-neutral-300">
              Calzado e indumentaria urbana para moverse por la ciudad, el cerro y lo que
              venga. Más de 240 modelos.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/catalogo"
                className="rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200">
                Ver catálogo
              </Link>
              <Link href="/catalogo?categoria=zapatillas-running"
                className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-medium transition hover:bg-white/10">
                Running
              </Link>
            </div>
          </div>

          {/* Composición de producto, puro SVG */}
          <div className="relative hidden h-72 lg:block">
            <div className="absolute right-10 top-0 rotate-[-8deg]">
              <IlustracionProducto categoria="zapatillas-running" hex="#00B6ED" semilla={3} className="h-44 w-auto drop-shadow-2xl" />
            </div>
            <div className="absolute bottom-2 right-36 rotate-[6deg]">
              <IlustracionProducto categoria="zapatillas-trail" hex="#78BF26" semilla={7} className="h-36 w-auto drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Beneficios ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-neutral-200 lg:grid-cols-4 dark:bg-neutral-800">
        {BENEFICIOS.map((b) => (
          <div key={b.titulo} className="bg-white px-5 py-5 dark:bg-neutral-900">
            <p className="text-sm font-semibold">{b.titulo}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{b.detalle}</p>
          </div>
        ))}
      </section>

      {/* ── Categorías ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Explora por categoría</h2>
          <Link href="/catalogo" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Ver todo
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIAS.map((c) => (
            <Link key={c.slug} href={`/catalogo?categoria=${c.slug}`}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 p-5 transition hover:-translate-y-1 hover:shadow-md dark:border-neutral-800">
              <div className="flex h-20 w-full items-center justify-center rounded-xl"
                style={{ backgroundColor: `${c.hex}14` }}>
                <IlustracionProducto categoria={c.slug} hex={c.hex} semilla={1}
                  className="h-16 w-auto transition-transform duration-300 group-hover:scale-110" />
              </div>
              <span className="text-sm font-medium">{c.nombre}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Destacados ──────────────────────────────────────────────── */}
      <section>
        <div className="mb-5 flex items-baseline justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Destacados</h2>
            <p className="mt-1 text-sm text-neutral-500">Lo más buscado esta semana</p>
          </div>
          <Link href="/catalogo" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Ver todo
          </Link>
        </div>

        {destacados.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            Todavía no hay productos cargados. Ejecuta{' '}
            <code className="font-mono">npm run semilla</code> para generar el catálogo.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {destacados.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}
      </section>

      {/* ── Franja final ────────────────────────────────────────────── */}
      <section className="relative -mx-4 overflow-hidden bg-neutral-950 px-6 py-14 text-white sm:mx-0 sm:rounded-3xl sm:px-14">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #712F9155, transparent 70%)' }} />
        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Todo el catálogo, una sola búsqueda
            </h2>
            <p className="mt-2 max-w-lg text-sm text-neutral-300">
              Filtra por categoría, marca, talla, color y precio. 240 productos con 4552
              combinaciones disponibles.
            </p>
          </div>
          <Link href="/catalogo"
            className="shrink-0 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200">
            Explorar
          </Link>
        </div>
      </section>
    </div>
  );
}
