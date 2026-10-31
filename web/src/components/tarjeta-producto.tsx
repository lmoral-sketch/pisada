/**
 * Tarjeta de producto usada en el home, el catálogo y los relacionados.
 *
 * No incluye imagen remota: el catálogo es sintético y las fotos reales
 * introducirían una variable de red ajena al sistema que estamos midiendo.
 * En su lugar se dibuja un bloque de color derivado del producto, lo que
 * mantiene el peso de la página bajo nuestro control.
 */

import Link from 'next/link';
import type { ProductoListado } from '@/lib/catalogo';
import { precio } from '@/lib/formato';

export function TarjetaProducto({ producto }: { producto: ProductoListado }) {
  const agotado = producto.stock_total === 0;
  const colores = (producto.colores ?? []).filter(Boolean);

  return (
    <Link
      href={`/producto/${producto.slug}`}
      className="group flex flex-col rounded-lg border border-neutral-200 bg-white transition hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
    >
      {/* Marcador visual del producto, construido con el color principal. */}
      <div
        className="relative h-44 rounded-t-lg"
        style={{ backgroundColor: colores[0] ?? '#d4d4d4' }}
      >
        {agotado && (
          <span className="absolute right-2 top-2 rounded bg-neutral-900/80 px-2 py-1 text-xs font-medium text-white">
            Agotado
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          {producto.marca}
        </span>
        <h3 className="text-sm font-medium leading-snug text-neutral-900 dark:text-neutral-100">
          {producto.nombre}
        </h3>
        <span className="text-xs text-neutral-500">{producto.categoria}</span>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            {precio(producto.precio_clp)}
          </span>
          <div className="flex gap-1" aria-label="Colores disponibles">
            {colores.slice(0, 4).map((hex) => (
              <span
                key={hex}
                className="h-3 w-3 rounded-full border border-neutral-300 dark:border-neutral-700"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
