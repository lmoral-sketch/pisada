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
      <section className="rounded-xl bg-neutral-900 px-8 py-12 text-white dark:bg-neutral-800">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Zapatillas que aguantan el día completo
        </h1>
        <p className="mt-3 max-w-xl text-neutral-300">
          Calzado e indumentaria urbana para moverse por la ciudad, el cerro y lo que
          venga.
        </p>
        <Link
          href="/catalogo"
          className="mt-6 inline-block rounded-md bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-200"
        >
          Ver catálogo
        </Link>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Destacados</h2>
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
