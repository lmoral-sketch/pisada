/**
 * Detalle de producto.
 *
 * Peso INTERMEDIO (regla 11 de AGENTS.md): resuelve el producto, su matriz
 * completa de variantes con disponibilidad por talla y color, y los productos
 * relacionados de la misma categoría.
 *
 * La matriz de tallas es, además, el punto donde se origina el abandono del
 * embudo: una talla sin stock es una conversión perdida que queda registrada
 * en GA4.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  obtenerProducto,
  obtenerRelacionados,
  type VarianteDetalle,
} from '@/lib/catalogo';
import { medirPagina } from '@/lib/instrumentar';
import { precio, etiquetaCampo, valorCampo } from '@/lib/formato';
import { TarjetaProducto } from '@/components/tarjeta-producto';
import { SelectorVariante } from '@/components/selector-variante';

export const dynamic = 'force-dynamic';

export default async function DetalleProducto({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const datos = await medirPagina('/producto/[slug]', async () => {
    const producto = await obtenerProducto(slug);
    if (!producto) return null;

    const relacionados = await obtenerRelacionados(
      producto.categoria_slug,
      producto.id,
      4,
    );
    return { producto, relacionados };
  });

  if (!datos) notFound();
  const { producto, relacionados } = datos;

  // Las variantes se agrupan por color para construir la matriz de tallas.
  const porColor = new Map<string, { hex: string; variantes: VarianteDetalle[] }>();
  for (const v of producto.variantes) {
    if (!porColor.has(v.color)) porColor.set(v.color, { hex: v.color_hex, variantes: [] });
    porColor.get(v.color)!.variantes.push(v);
  }

  const stockTotal = producto.variantes.reduce((suma, v) => suma + v.stock, 0);

  return (
    <div className="flex flex-col gap-12">
      <nav className="text-sm text-neutral-500">
        <Link href="/catalogo" className="hover:underline">
          Catálogo
        </Link>
        {' / '}
        <Link href={`/catalogo?categoria=${producto.categoria_slug}`} className="hover:underline">
          {producto.categoria}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Galería: bloques de color por variante disponible. */}
        <div className="flex flex-col gap-3">
          <div
            className="h-80 rounded-xl"
            style={{ backgroundColor: [...porColor.values()][0]?.hex ?? '#d4d4d4' }}
          />
          <div className="flex gap-3">
            {[...porColor.entries()].map(([nombre, { hex }]) => (
              <div
                key={nombre}
                title={nombre}
                className="h-20 w-20 rounded-lg border border-neutral-200 dark:border-neutral-800"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>

        {/* Ficha y selección de talla. */}
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-sm uppercase tracking-wide text-neutral-500">
              {producto.marca}
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{producto.nombre}</h1>
            <p className="mt-2 text-2xl font-semibold">{precio(producto.precio_clp)}</p>
          </div>

          <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {producto.descripcion}
          </p>

          <SelectorVariante
            nombreProducto={producto.nombre}
            marca={producto.marca}
            categoria={producto.categoria}
            precioClp={producto.precio_clp}
            variantes={producto.variantes}
          />

          {/* Dato operativo útil para correlacionar el abandono del embudo con
              la disponibilidad real al momento de la visita. */}
          <p className="text-xs text-neutral-500">
            {stockTotal} {stockTotal === 1 ? 'unidad disponible' : 'unidades disponibles'} en{' '}
            {producto.variantes.filter((v) => v.stock > 0).length} de{' '}
            {producto.variantes.length} combinaciones.
          </p>

          {/* Ficha técnica: es lo que da peso intermedio a esta página. */}
          <dl className="mt-2 divide-y divide-neutral-200 border-t border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
            {Object.entries(producto.ficha).map(([clave, valor]) => (
              <div key={clave} className="flex justify-between gap-4 py-2">
                <dt className="text-neutral-500">{etiquetaCampo(clave)}</dt>
                <dd className="text-right">{valorCampo(clave, valor)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {relacionados.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">También te puede servir</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {relacionados.map((p) => (
              <TarjetaProducto key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
