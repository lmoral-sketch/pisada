/**
 * Emisión de eventos de comercio electrónico hacia Google Analytics 4.
 *
 * Los nombres de evento y la forma de los parámetros siguen el esquema de
 * medición mejorada de comercio de GA4. Respetarlo no es un capricho: solo así
 * GA4 arma por su cuenta el informe de embudo
 * (vitrina → carrito → compra → pago) que la Fase 2 pide analizar.
 *
 * Todas las funciones son seguras de llamar aunque GA4 no esté cargado.
 */

type ParametrosGtag = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (comando: string, evento: string, parametros?: ParametrosGtag) => void;
  }
}

/** Artículo en el formato que espera GA4. */
export type ArticuloGA = {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price: number;
  quantity?: number;
};

/** Envía un evento a GA4 si está disponible. */
function enviar(evento: string, parametros: ParametrosGtag): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', evento, { currency: 'CLP', ...parametros });
}

/** Vista de ficha de producto. Primer paso del embudo. */
export function verProducto(articulo: ArticuloGA): void {
  enviar('view_item', { value: articulo.price, items: [articulo] });
}

/** Agregado al carrito. Segundo paso del embudo. */
export function agregarAlCarrito(articulo: ArticuloGA): void {
  enviar('add_to_cart', {
    value: articulo.price * (articulo.quantity ?? 1),
    items: [articulo],
  });
}

/** Inicio del checkout. Tercer paso del embudo. */
export function iniciarCheckout(articulos: ArticuloGA[], totalClp: number): void {
  enviar('begin_checkout', { value: totalClp, items: articulos });
}

/** Compra completada. Último paso del embudo. */
export function comprar(
  pedidoId: number,
  articulos: ArticuloGA[],
  totalClp: number,
): void {
  enviar('purchase', {
    transaction_id: String(pedidoId),
    value: totalClp,
    items: articulos,
  });
}

/**
 * Intento de compra rechazado por falta de stock.
 *
 * No es un evento estándar de GA4, pero es el que explica el punto de fuga del
 * embudo bajo carga: sin él, en el informe se vería una caída de conversión sin
 * causa aparente.
 */
export function compraSinStock(sku: string): void {
  enviar('compra_sin_stock', { sku });
}
