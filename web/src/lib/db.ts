/**
 * Acceso a PostgreSQL.
 *
 * Se usa SQL directo con `pg`, sin ORM, por una razón propia del ramo: el
 * trabajo consiste en analizar el costo de las consultas. Un ORM genera el SQL
 * por nosotros y esconde precisamente lo que hay que medir, además de dificultar
 * el uso explícito de `SELECT ... FOR UPDATE`.
 */

import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import {
  conexionesAgotadas,
  conexionesPool,
  duracionConsulta,
  esperaConexion,
  medir,
} from './metricas';

const global_ = globalThis as unknown as { poolPg?: Pool };

/**
 * Tamaño del pool.
 *
 * Es un parámetro de capacidad, no un detalle de configuración: acota cuántas
 * consultas pueden ejecutarse en paralelo y, por lo tanto, cuánta espera se
 * acumula antes de llegar a la base.
 *
 * El valor por defecto es 20 porque se midió (experimento E-15). Con el
 * escenario de pico y 350 usuarios concurrentes:
 *
 *   pool  5 → p(95) 1.000 ms · 141 peticiones esperando
 *   pool 10 → p(95)   916 ms · 380 peticiones esperando
 *   pool 20 → p(95)   156 ms ·   4 peticiones esperando
 *
 * Subir de 10 a 20 reduce el p(95) por un factor de 5,9 con el mismo hardware.
 * La CPU queda igualmente exigida en los tres casos: lo que desaparece es la
 * cola de admisión al pool.
 */
const TAMANO_POOL = Number(process.env.PG_POOL_MAX ?? 20);

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
  // La espera por una conexión se mide por separado del trabajo que se hace
  // con ella. Es la segunda cola del sistema, y la que propaga la contención
  // del bloqueo de stock al resto del sitio.
  const finEspera = esperaConexion.startTimer();
  let cliente: PoolClient;
  try {
    cliente = await pool.connect();
  } catch (error) {
    conexionesAgotadas.inc();
    throw error;
  } finally {
    finEspera();
    actualizarMetricasPool();
  }

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
