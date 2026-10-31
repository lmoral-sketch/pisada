/**
 * Acceso a PostgreSQL.
 *
 * Se usa SQL directo con `pg`, sin ORM, por una razón propia del ramo: el
 * trabajo consiste en analizar el costo de las consultas. Un ORM genera el SQL
 * por nosotros y esconde precisamente lo que hay que medir, además de dificultar
 * el uso explícito de `SELECT ... FOR UPDATE`.
 */

import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { conexionesPool, duracionConsulta, medir } from './metricas';

const global_ = globalThis as unknown as { poolPg?: Pool };

/**
 * Tamaño del pool.
 *
 * Es un parámetro de capacidad, no un detalle de configuración: acota cuántas
 * consultas pueden ejecutarse en paralelo y, por lo tanto, dónde aparece el
 * punto de saturación. Se deja configurable para poder estudiarlo en la Fase 2.
 */
const TAMANO_POOL = Number(process.env.PG_POOL_MAX ?? 10);

function crearPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: TAMANO_POOL,
    // Si una conexión no se consigue en 10 s, se falla en vez de esperar sin
    // límite. Bajo saturación conviene un error medible antes que un cuelgue.
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  pool.on('error', (error) => {
    console.error('Error inesperado en el pool de PostgreSQL:', error);
  });

  return pool;
}

export const pool: Pool = global_.poolPg ?? crearPool();
global_.poolPg = pool;

/** Publica el estado del pool en las métricas. */
function actualizarMetricasPool() {
  conexionesPool.set({ estado: 'total' }, pool.totalCount);
  conexionesPool.set({ estado: 'ocioso' }, pool.idleCount);
  // Peticiones esperando una conexión libre: es la cola de entrada al pool.
  conexionesPool.set({ estado: 'en_espera' }, pool.waitingCount);
}

/**
 * Ejecuta una consulta midiendo su duración.
 *
 * @param operacion Nombre corto que identifica la consulta en las métricas.
 *                  Debe ser de cardinalidad baja: nunca interpolar valores.
 * @param texto     SQL parametrizado.
 * @param valores   Parámetros de la consulta.
 */
export async function consultar<T extends QueryResultRow>(
  operacion: string,
  texto: string,
  valores: unknown[] = [],
): Promise<T[]> {
  actualizarMetricasPool();
  const resultado = await medir(duracionConsulta, { operacion }, () =>
    pool.query<T>(texto, valores),
  );
  actualizarMetricasPool();
  return resultado.rows;
}

/**
 * Ejecuta una función dentro de una transacción, liberando siempre la conexión.
 *
 * Se usa en el checkout, donde el descuento de stock y la creación del pedido
 * deben ser atómicos: si el stock no alcanza, nada debe quedar escrito.
 */
export async function enTransaccion<T>(
  trabajo: (cliente: PoolClient) => Promise<T>,
): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
    actualizarMetricasPool();
  }
}
