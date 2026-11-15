/**
 * Home.
 *
 * Página deliberadamente LIVIANA (regla 11 de AGENTS.md): una sola consulta
 * acotada a los productos destacados. Sirve de línea base contra la cual
 * comparar la degradación del catálogo bajo carga.
 */

import Link from 'next/link';
import { obtenerDestacados } from '@/lib/catalogo';
import { medirPagina } from '@/lib/instrumentar';
import { TarjetaProducto } from '@/components/tarjeta-producto';

// El catálogo cambia con las compras, así que la página se renderiza por
// petición. Además, una página cacheada no permitiría medir el costo real del
// servidor bajo carga, que es justamente el objeto del trabajo.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const destacados = await medirPagina('/', () => obtenerDestacados(8));

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-3xl bg-neutral-900 px-8 py-16 text-white sm:px-14 sm:py-20">
        {/* Halo de color, puro CSS: no agrega peticiones de red */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, #00B6ED55, transparent 70%)' }}
        />
        <div className="relative">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90">
            Nueva temporada
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Zapatillas que aguantan
            <br />
            el día completo
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-300">
            Calzado e indumentaria urbana para moverse por la ciudad, el cerro y lo que
            venga.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200"
            >
              Ver catálogo
            </Link>
            <Link
              href="/catalogo?categoria=zapatillas-running"
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Running
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Destacados</h2>
          <Link href="/catalogo" className="text-sm text-neutral-600 hover:underline dark:text-neutral-400">
            Ver todo
          </Link>
        </div>

        {destacados.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
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
    </div>
  );
}
