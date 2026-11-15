/**
 * Tarjeta de producto usada en el home, el catálogo y los relacionados.
 *
 * La ilustración es SVG en línea, no una imagen remota. Ver `marca.tsx` para la
 * justificación: una foto por producto sumaría peticiones de red que
 * invalidarían las mediciones ya publicadas en el informe.
 */

import Link from 'next/link';
import type { ProductoListado } from '@/lib/catalogo';
import { precio } from '@/lib/formato';
import { IlustracionProducto } from './marca';

export function TarjetaProducto({ producto }: { producto: ProductoListado }) {
  const agotado = producto.stock_total === 0;
  const colores = (producto.colores ?? []).filter(Boolean);
  const principal = colores[0] ?? '#8a8a8a';

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
    >
      <div
        className="relative flex h-44 items-center justify-center overflow-hidden"
        style={{ backgroundColor: `${principal}14` }}
      >
        <IlustracionProducto
          hex={principal}
          semilla={producto.id}
          className="h-32 w-auto transition-transform duration-300 group-hover:scale-105"
        />

        {agotado && (
          <span className="absolute right-3 top-3 rounded-full bg-neutral-900/85 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
          {producto.marca}
        </span>
        <h3 className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
          {producto.nombre}
        </h3>
        <span className="text-xs text-neutral-500">{producto.categoria}</span>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {precio(producto.precio_clp)}
          </span>
          <div className="flex gap-1" aria-label="Colores disponibles">
            {colores.slice(0, 4).map((hex) => (
              <span
                key={hex}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
