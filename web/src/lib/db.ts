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
 * El valor por defecto es 10. Conviene explicar por qué NO es 20.
 *
 * El experimento E-15 midió una corrida por tamaño de pool y arrojó una
 * diferencia enorme: p(95) de 916 ms con pool 10 contra 156 ms con pool 20.
 * Sobre esa base se cambió el valor por defecto a 20 y se escribió el hallazgo
 * en el informe. La auditoría interna marcó el riesgo de concluir desde una
 * sola corrida (hallazgo A-3), y al repetir el experimento tres veces por
 * tamaño el resultado NO se reprodujo (experimento E-16):
 *
 *   pool  5 → p(95) entre 130 y 276 ms  (n=3)
 *   pool 10 → p(95) entre 144 y 166 ms  (n=3)
 *   pool 20 → p(95) entre 140 y 162 ms  (n=2)
 *
 * Los tres rangos se solapan por completo. La variabilidad entre corridas de
 * la misma configuración es mayor que cualquier efecto atribuible al tamaño
 * del pool en este rango. Con esa evidencia no hay razón medida para subirlo,
 * y 10 es el valor conservador: menos conexiones simultáneas contra una base
 * limitada a 1 CPU.
 *
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
