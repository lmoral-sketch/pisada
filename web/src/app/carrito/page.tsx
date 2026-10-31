/**
 * Carrito y pago.
 *
 * El contenido se renderiza en el servidor y el botón de pago vive en un
 * componente de cliente, porque los eventos `begin_checkout` y `purchase` de
 * GA4 se emiten desde el navegador.
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  COOKIE_CARRITO,
  calcularTotal,
  obtenerItems,
  obtenerOCrearCarrito,
} from '@/lib/carrito';
import { medirPagina } from '@/lib/instrumentar';
import { precio } from '@/lib/formato';
import { BotonPagar } from '@/components/boton-pagar';

export const dynamic = 'force-dynamic';

export default async function Carrito() {
  const token = (await cookies()).get(COOKIE_CARRITO)?.value;

  const items = await medirPagina('/carrito', async () => {
    if (!token) return [];
    const carritoId = await obtenerOCrearCarrito(token);
    return obtenerItems(carritoId);
  });

  const total = calcularTotal(items);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
        <Link
          href="/catalogo"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Tu carrito</h1>

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((item) => (
          <li key={item.variante_id} className="flex items-center gap-4 p-4">
            <span
              className="h-14 w-14 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-800"
              style={{ backgroundColor: item.color_hex }}
            />
            <div className="flex-1">
              <Link href={`/producto/${item.slug}`} className="text-sm font-medium hover:underline">
                {item.producto}
              </Link>
              <p className="text-xs text-neutral-500">
                {item.marca} · Talla {item.talla} · {item.color}
              </p>
              <p className="font-mono text-xs text-neutral-400">{item.sku}</p>
              {/* El stock puede haber cambiado desde que se agregó: avisar
                  antes del pago evita un rechazo sorpresivo en el checkout. */}
              {item.stock < item.cantidad && (
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-500">
                  Solo quedan {item.stock}{' '}
                  {item.stock === 1 ? 'unidad' : 'unidades'} de esta talla.
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm">
                {item.cantidad} × {precio(item.precio_clp)}
              </p>
              <p className="font-semibold">{precio(item.precio_clp * item.cantidad)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Total</span>
        <span className="text-xl font-bold">{precio(total)}</span>
      </div>

      <BotonPagar items={items} totalClp={total} />

      <p className="text-xs text-neutral-500">
        Compra simulada con fines académicos. No se procesa ningún pago real ni se
        solicitan datos de tarjeta.
      </p>
    </div>
  );
}
