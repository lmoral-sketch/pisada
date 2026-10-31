/**
 * Carrito de compras.
 *
 * El carrito se identifica con un token guardado en una cookie, de modo que
 * funcione para visitantes anónimos. Los usuarios sintéticos de k6 mantienen su
 * propia cookie por usuario virtual, así que cada uno opera un carrito distinto
 * — igual que usuarios reales.
 *
 * El carrito opera sobre VARIANTES, no sobre productos: lo que se compra es un
 * SKU concreto (producto + talla + color).
 */

import { randomUUID } from 'node:crypto';
import { consultar } from './db';

export const COOKIE_CARRITO = 'pisada_carrito';

export type ItemCarrito = {
  variante_id: number;
  sku: string;
  cantidad: number;
  producto: string;
  slug: string;
  marca: string;
  talla: string;
  color: string;
  color_hex: string;
  precio_clp: number;
  /** Stock disponible al momento de consultar. Puede cambiar antes del pago. */
  stock: number;
};

/** Genera un token nuevo de carrito. */
export function nuevoToken(): string {
  return randomUUID();
}

/**
 * Obtiene el id del carrito asociado al token, creándolo si no existe.
 *
 * Se usa ON CONFLICT en vez de "consultar y luego insertar" porque dos
 * peticiones concurrentes del mismo usuario podrían intentar crear el carrito
 * a la vez. Bajo carga esa condición de carrera deja de ser teórica.
 */
export async function obtenerOCrearCarrito(token: string): Promise<number> {
  const [fila] = await consultar<{ id: number }>(
    'carrito_obtener_o_crear',
    `INSERT INTO carrito (token) VALUES ($1)
     ON CONFLICT (token) DO UPDATE SET actualizado_en = NOW()
     RETURNING id`,
    [token],
  );
  return fila.id;
}

/**
 * Agrega una variante al carrito o incrementa su cantidad.
 *
 * Deliberadamente NO descuenta stock: reservar inventario al agregar al carrito
 * desplazaría la contención fuera del checkout y cambiaría el fenómeno que el
 * trabajo quiere medir. El stock se descuenta al pagar, como en la mayoría de
 * los comercios reales.
 */
export async function agregarItem(
  carritoId: number,
  varianteId: number,
  cantidad: number,
): Promise<void> {
  await consultar(
    'carrito_agregar_item',
    `INSERT INTO carrito_item (carrito_id, variante_id, cantidad)
     VALUES ($1, $2, $3)
     ON CONFLICT (carrito_id, variante_id)
     DO UPDATE SET cantidad = carrito_item.cantidad + EXCLUDED.cantidad`,
    [carritoId, varianteId, cantidad],
  );
}

/** Quita una variante del carrito por completo. */
export async function quitarItem(carritoId: number, varianteId: number): Promise<void> {
  await consultar(
    'carrito_quitar_item',
    'DELETE FROM carrito_item WHERE carrito_id = $1 AND variante_id = $2',
    [carritoId, varianteId],
  );
}

/** Vacía el carrito. Se llama tras un pago exitoso. */
export async function vaciarCarrito(carritoId: number): Promise<void> {
  await consultar('carrito_vaciar', 'DELETE FROM carrito_item WHERE carrito_id = $1', [
    carritoId,
  ]);
}

/** Contenido del carrito con los datos necesarios para mostrarlo. */
export async function obtenerItems(carritoId: number): Promise<ItemCarrito[]> {
  return consultar<ItemCarrito>(
    'carrito_items',
    `SELECT ci.variante_id, v.sku, ci.cantidad,
            p.nombre AS producto, p.slug, m.nombre AS marca,
            t.etiqueta AS talla, co.nombre AS color, co.codigo_hex AS color_hex,
            p.precio_clp, v.stock
       FROM carrito_item ci
       JOIN variante  v  ON v.id  = ci.variante_id
       JOIN producto  p  ON p.id  = v.producto_id
       JOIN marca     m  ON m.id  = p.marca_id
       JOIN talla     t  ON t.id  = v.talla_id
       JOIN color     co ON co.id = v.color_id
      WHERE ci.carrito_id = $1
      ORDER BY ci.id`,
    [carritoId],
  );
}

/** Total del carrito en pesos. */
export function calcularTotal(items: ItemCarrito[]): number {
  return items.reduce((suma, item) => suma + item.precio_clp * item.cantidad, 0);
}
