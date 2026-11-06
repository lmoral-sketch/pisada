'use client';

/**
 * Botón de pago.
 *
 * Emite los dos últimos eventos del embudo de GA4 y maneja de forma explícita
 * el rechazo por falta de stock, que es el desenlace interesante bajo carga: no
 * es un error del sistema, es el inventario agotándose.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ItemCarrito } from '@/lib/carrito';
import { precio } from '@/lib/formato';
import { comprar, compraSinStock, iniciarCheckout, type ArticuloGA } from '@/lib/ga';

type Props = {
  items: ItemCarrito[];
  totalClp: number;
};

export function BotonPagar({ items, totalClp }: Props) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<
    | { tipo: 'exito'; pedidoId: number }
    | { tipo: 'sin_stock'; sku: string; disponible: number }
    | { tipo: 'conflicto' }
    | { tipo: 'error'; mensaje: string }
    | null
  >(null);

  /** Convierte los items del carrito al formato de artículos de GA4. */
  function aArticulos(): ArticuloGA[] {
    return items.map((item) => ({
      item_id: item.sku,
      item_name: item.producto,
      item_brand: item.marca,
      item_variant: `${item.color} / ${item.talla}`,
      price: item.precio_clp,
      quantity: item.cantidad,
    }));
  }

  async function alPagar() {
    if (enviando) return;
    setEnviando(true);
    setResultado(null);

    const articulos = aArticulos();
    // Tercer paso del embudo, antes de conocer el desenlace.
    iniciarCheckout(articulos, totalClp);

    try {
      const respuesta = await fetch('/api/checkout', { method: 'POST' });
      const datos = await respuesta.json();

      if (respuesta.ok && datos.ok) {
        comprar(datos.pedido_id, articulos, datos.total_clp);
        setResultado({ tipo: 'exito', pedidoId: datos.pedido_id });
        // No se refresca aquí a propósito. El checkout vacía el carrito, así
        // que un refresco volvería a renderizar la página del carrito en su
        // estado vacío, lo que desmonta este componente y hace desaparecer la
        // confirmación antes de que el usuario alcance a leerla.
        return;
      }

      if (respuesta.status === 409) {
        compraSinStock(datos.sku);
        setResultado({ tipo: 'sin_stock', sku: datos.sku, disponible: datos.disponible });
        router.refresh();
        return;
      }

      if (respuesta.status === 503) {
        setResultado({ tipo: 'conflicto' });
        return;
      }

      setResultado({ tipo: 'error', mensaje: 'No se pudo completar la compra.' });
    } catch {
      setResultado({ tipo: 'error', mensaje: 'Error de conexión.' });
    } finally {
      setEnviando(false);
    }
  }

  if (resultado?.tipo === 'exito') {
    return (
      <div className="rounded-lg border border-green-300 bg-green-50 p-5 text-center dark:border-green-900 dark:bg-green-950">
        <h2 className="text-lg font-semibold text-green-900 dark:text-green-200">
          ¡Compra confirmada!
        </h2>
        <p className="mt-1 text-sm text-green-800 dark:text-green-300">
          Pedido N° {resultado.pedidoId} por {precio(totalClp)}.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={alPagar}
        disabled={enviando}
        className="rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:enabled:hover:bg-neutral-300"
      >
        {enviando ? 'Procesando pago...' : `Pagar ${precio(totalClp)}`}
      </button>

      {resultado?.tipo === 'sin_stock' && (
        <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Se agotó el stock de {resultado.sku} mientras pagabas.{' '}
          {resultado.disponible > 0
            ? `Quedan ${resultado.disponible}.`
            : 'No quedan unidades.'}{' '}
          Ajusta tu carrito e intenta de nuevo.
        </p>
      )}

      {resultado?.tipo === 'conflicto' && (
        <p role="alert" className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Hay mucha demanda por este producto en este momento. Intenta nuevamente en unos
          segundos.
        </p>
      )}

      {resultado?.tipo === 'error' && (
        <p role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          {resultado.mensaje}
        </p>
      )}
    </div>
  );
}
