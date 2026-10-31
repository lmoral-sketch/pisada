/**
 * Checkout y descuento de inventario.
 *
 * ESTE ES EL NÚCLEO DEL TRABAJO.
 *
 * El descuento de stock sobre `variante.stock` es un recurso serializado: dos
 * compras del mismo SKU no pueden ejecutarse en paralelo sin coordinación. Bajo
 * usuarios concurrentes eso produce una cola de espera real, que es lo que
 * permite aplicar teoría de colas y la ley de Amdahl con mediciones propias en
 * lugar de con un ejemplo de pizarrón.
 *
 * Se implementan DOS estrategias de control de concurrencia para poder
 * compararlas empíricamente en la Fase 2:
 *
 *   - PESIMISTA: `SELECT ... FOR UPDATE` toma el bloqueo de la fila antes de
 *     leer el stock. Las transacciones que compiten por el mismo SKU esperan en
 *     el gestor de bloqueos de PostgreSQL. La espera es visible y acotada, pero
 *     la fila queda bloqueada durante toda la transacción.
 *
 *   - OPTIMISTA: no se toma bloqueo explícito. Se ejecuta una actualización
 *     condicional (`WHERE stock >= cantidad`) y se verifica cuántas filas se
 *     modificaron. Si otra transacción ganó la carrera, se reintenta. No hay
 *     espera en cola, pero sí trabajo desperdiciado en los reintentos.
 *
 * La hipótesis a contrastar con datos: la pesimista degrada de forma más suave
 * pero con mayor latencia media bajo contención alta, mientras que la optimista
 * es más rápida con contención baja y se desploma cuando la contención sube,
 * porque la tasa de reintentos crece.
 */

import type { PoolClient } from 'pg';
import { enTransaccion } from './db';
import { comprasSinStock, esperaBloqueoStock } from './metricas';
import { vaciarCarrito, type ItemCarrito } from './carrito';

/** Estrategia de control de concurrencia para el descuento de stock. */
export type Estrategia = 'pesimista' | 'optimista';

/**
 * Estrategia por defecto. Configurable por entorno para poder correr los mismos
 * escenarios de k6 contra ambas sin tocar el código.
 */
export const ESTRATEGIA_POR_DEFECTO: Estrategia =
  process.env.ESTRATEGIA_STOCK === 'optimista' ? 'optimista' : 'pesimista';

/** Número máximo de reintentos de la estrategia optimista antes de desistir. */
const MAX_REINTENTOS = 5;

/**
 * Resultado del descuento de una variante.
 *
 * Ambas estrategias comparten esta forma para que el llamador no tenga que
 * distinguirlas. `reintentos` es siempre cero en la pesimista, que espera en
 * lugar de reintentar: eso mismo hace comparables las dos en el informe.
 */
type ResultadoDescuento =
  | { ok: true; reintentos: number }
  | { ok: false; sku: string; disponible: number };

export type ResultadoCheckout =
  | { ok: true; pedidoId: number; totalClp: number; reintentos: number }
  | { ok: false; motivo: 'sin_stock'; sku: string; disponible: number }
  | { ok: false; motivo: 'carrito_vacio' }
  | { ok: false; motivo: 'conflicto' };

/**
 * Descuenta stock con bloqueo pesimista.
 *
 * El `SELECT ... FOR UPDATE` es el punto donde la transacción espera si otra
 * tiene tomada la fila. Ese tiempo se mide de forma aislada: es el tiempo de
 * espera en cola del recurso.
 */
async function descontarPesimista(
  cliente: PoolClient,
  varianteId: number,
  cantidad: number,
): Promise<ResultadoDescuento> {
  const fin = esperaBloqueoStock.startTimer({ estrategia: 'pesimista' });

  // La espera ocurre dentro de esta consulta: PostgreSQL no la devuelve hasta
  // que el bloqueo de la fila está disponible.
  const { rows } = await cliente.query<{ stock: number; sku: string }>(
    'SELECT stock, sku FROM variante WHERE id = $1 FOR UPDATE',
    [varianteId],
  );

  fin();

  const variante = rows[0];
  if (!variante || variante.stock < cantidad) {
    return { ok: false, sku: variante?.sku ?? String(varianteId), disponible: variante?.stock ?? 0 };
  }

  await cliente.query(
    'UPDATE variante SET stock = stock - $1, version = version + 1 WHERE id = $2',
    [cantidad, varianteId],
  );

  // La estrategia pesimista no reintenta: espera. Se informa cero para que
  // ambas estrategias compartan la misma forma de resultado.
  return { ok: true, reintentos: 0 };
}

/**
 * Descuenta stock con control optimista.
 *
 * La condición `stock >= $1` dentro del UPDATE hace que la operación sea segura
 * sin bloqueo previo: si otra transacción consumió el stock en el intervalo, la
 * actualización simplemente no afecta ninguna fila.
 *
 * @returns Cantidad de reintentos consumidos, para poder correlacionar la tasa
 *          de reintentos con el nivel de contención en el informe.
 */
async function descontarOptimista(
  cliente: PoolClient,
  varianteId: number,
  cantidad: number,
): Promise<ResultadoDescuento> {
  const fin = esperaBloqueoStock.startTimer({ estrategia: 'optimista' });

  try {
    for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
      const { rowCount } = await cliente.query(
        `UPDATE variante
            SET stock = stock - $1, version = version + 1
          WHERE id = $2 AND stock >= $1`,
        [cantidad, varianteId],
      );

      if (rowCount === 1) return { ok: true, reintentos: intento };

      // No se actualizó ninguna fila: o bien el stock no alcanza, o bien otra
      // transacción ganó la carrera. Hay que distinguir ambos casos.
      const { rows } = await cliente.query<{ stock: number; sku: string }>(
        'SELECT stock, sku FROM variante WHERE id = $1',
        [varianteId],
      );

      const variante = rows[0];
      if (!variante || variante.stock < cantidad) {
        // Stock insuficiente de verdad: reintentar no serviría de nada.
        return {
          ok: false,
          sku: variante?.sku ?? String(varianteId),
          disponible: variante?.stock ?? 0,
        };
      }
      // Había stock suficiente: fue una carrera perdida. Se reintenta.
    }

    // Se agotaron los reintentos con stock aparentemente disponible: es
    // contención extrema. Se reporta como conflicto, no como falta de stock.
    return { ok: false, sku: String(varianteId), disponible: -1 };
  } finally {
    fin();
  }
}

/**
 * Procesa el pago simulado de un carrito.
 *
 * Todo ocurre dentro de una única transacción: o se descuenta el stock de todos
 * los items y se crea el pedido, o no se escribe nada.
 *
 * @param estrategia Permite forzar una estrategia para comparar ambas en la
 *                   misma corrida de pruebas.
 */
export async function procesarCheckout(
  carritoId: number,
  items: ItemCarrito[],
  estrategia: Estrategia = ESTRATEGIA_POR_DEFECTO,
): Promise<ResultadoCheckout> {
  if (items.length === 0) return { ok: false, motivo: 'carrito_vacio' };

  // Los items se ordenan por id de variante antes de tomar los bloqueos.
  //
  // Esto NO es un detalle menor: si dos transacciones bloquearan las mismas dos
  // filas en orden distinto, se produciría un interbloqueo (deadlock) y
  // PostgreSQL abortaría una de ellas. Tomar siempre los bloqueos en el mismo
  // orden global elimina esa posibilidad por construcción.
  const ordenados = [...items].sort((a, b) => a.variante_id - b.variante_id);

  return enTransaccion(async (cliente) => {
    let reintentosTotales = 0;

    for (const item of ordenados) {
      const resultado =
        estrategia === 'pesimista'
          ? await descontarPesimista(cliente, item.variante_id, item.cantidad)
          : await descontarOptimista(cliente, item.variante_id, item.cantidad);

      if (!resultado.ok) {
        comprasSinStock.inc();
        // El ROLLBACK lo hace enTransaccion al propagarse el retorno temprano
        // a través de la excepción de control que se lanza más abajo.
        if (resultado.disponible === -1) {
          throw new FalloCheckout({ ok: false, motivo: 'conflicto' });
        }
        throw new FalloCheckout({
          ok: false,
          motivo: 'sin_stock',
          sku: resultado.sku,
          disponible: resultado.disponible,
        });
      }

      reintentosTotales += resultado.reintentos;
    }

    // Todos los descuentos salieron bien: se crea el pedido.
    const totalClp = ordenados.reduce(
      (suma, item) => suma + item.precio_clp * item.cantidad,
      0,
    );

    const { rows } = await cliente.query<{ id: number }>(
      `INSERT INTO pedido (estado, total_clp, referencia_pago)
       VALUES ('pagado', $1, $2) RETURNING id`,
      [totalClp, `SIM-${Date.now()}-${Math.floor(Math.random() * 1e6)}`],
    );
    const pedidoId = rows[0].id;

    for (const item of ordenados) {
      await cliente.query(
        `INSERT INTO pedido_item (pedido_id, variante_id, cantidad, precio_unitario_clp)
         VALUES ($1, $2, $3, $4)`,
        [pedidoId, item.variante_id, item.cantidad, item.precio_clp],
      );
    }

    await vaciarCarrito(carritoId);

    return { ok: true as const, pedidoId, totalClp, reintentos: reintentosTotales };
  }).catch((error: unknown) => {
    // Un fallo de negocio no es un error del sistema: se traduce al resultado
    // correspondiente en vez de propagarse como excepción.
    if (error instanceof FalloCheckout) return error.resultado;
    throw error;
  });
}

/**
 * Excepción de control usada para abortar la transacción ante un fallo de
 * negocio. Garantiza el ROLLBACK sin tener que propagar el estado a mano.
 */
class FalloCheckout extends Error {
  constructor(public readonly resultado: ResultadoCheckout) {
    super('Fallo de checkout');
    this.name = 'FalloCheckout';
  }
}
