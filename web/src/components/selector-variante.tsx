'use client';

/**
 * Selección de talla y color, y agregado al carrito.
 *
 * Es un componente de cliente porque necesita estado de selección y porque los
 * eventos de GA4 se emiten desde el navegador. El resto de la página de detalle
 * sigue renderizándose en el servidor.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { VarianteDetalle } from '@/lib/catalogo';
import { precio } from '@/lib/formato';
import { agregarAlCarrito, verProducto, type ArticuloGA } from '@/lib/ga';

type Props = {
  nombreProducto: string;
  marca: string;
  categoria: string;
  precioClp: number;
  variantes: VarianteDetalle[];
};

export function SelectorVariante({
  nombreProducto,
  marca,
  categoria,
  precioClp,
  variantes,
}: Props) {
  const router = useRouter();
  const [seleccionada, setSeleccionada] = useState<VarianteDetalle | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Primer paso del embudo: la vista de la ficha se registra una sola vez, al
  // montar el componente.
  useEffect(() => {
    verProducto({
      item_id: variantes[0]?.sku ?? nombreProducto,
      item_name: nombreProducto,
      item_brand: marca,
      item_category: categoria,
      price: precioClp,
    });
    // Se ejecuta solo al montar: el producto no cambia dentro de la misma página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Las variantes llegan ordenadas por color y talla desde el servidor.
  const porColor = new Map<string, { hex: string; variantes: VarianteDetalle[] }>();
  for (const v of variantes) {
    if (!porColor.has(v.color)) porColor.set(v.color, { hex: v.color_hex, variantes: [] });
    porColor.get(v.color)!.variantes.push(v);
  }

  async function alAgregar() {
    if (!seleccionada || enviando) return;

    setEnviando(true);
    setMensaje(null);

    try {
      const respuesta = await fetch('/api/carrito', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variante_id: seleccionada.id, cantidad: 1 }),
      });

      if (!respuesta.ok) {
        setMensaje('No se pudo agregar el producto. Intenta de nuevo.');
        return;
      }

      const articulo: ArticuloGA = {
        item_id: seleccionada.sku,
        item_name: nombreProducto,
        item_brand: marca,
        item_category: categoria,
        item_variant: `${seleccionada.color} / ${seleccionada.talla}`,
        price: precioClp,
        quantity: 1,
      };
      agregarAlCarrito(articulo);

      setMensaje('Agregado al carrito.');
      // Refresca los componentes de servidor para que el stock mostrado quede
      // al día tras la compra de otros usuarios.
      router.refresh();
    } catch {
      setMensaje('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const stockTotal = variantes.reduce((suma, v) => suma + v.stock, 0);

  if (stockTotal === 0) {
    return (
      <p className="rounded-md bg-neutral-100 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
        Producto agotado en todas sus tallas.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-medium">Elige tu talla</h2>

      {[...porColor.entries()].map(([nombreColor, { hex, variantes: delColor }]) => (
        <div key={nombreColor}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-4 w-4 rounded-full border border-neutral-300 dark:border-neutral-700"
              style={{ backgroundColor: hex }}
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {nombreColor}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {delColor
              .slice()
              .sort((a, b) => a.talla_orden - b.talla_orden)
              .map((v) => {
                const activa = seleccionada?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock === 0}
                    onClick={() => setSeleccionada(v)}
                    title={
                      v.stock === 0
                        ? 'Sin stock'
                        : `${v.stock} ${v.stock === 1 ? 'unidad' : 'unidades'}`
                    }
                    className={`min-w-12 rounded-md border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:text-neutral-300 disabled:line-through dark:disabled:text-neutral-700 ${
                      activa
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                        : 'border-neutral-300 enabled:hover:border-neutral-900 dark:border-neutral-700 dark:enabled:hover:border-neutral-100'
                    }`}
                  >
                    {v.talla}
                  </button>
                );
              })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={alAgregar}
        disabled={!seleccionada || enviando}
        className="mt-2 rounded-md bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 dark:bg-neutral-100 dark:text-neutral-900 dark:enabled:hover:bg-neutral-300 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600"
      >
        {enviando
          ? 'Agregando...'
          : seleccionada
            ? `Agregar al carrito — ${precio(precioClp)}`
            : 'Elige una talla'}
      </button>

      {mensaje && (
        <p role="status" className="text-sm text-neutral-600 dark:text-neutral-400">
          {mensaje}
        </p>
      )}
    </div>
  );
}
