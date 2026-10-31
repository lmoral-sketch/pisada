/**
 * Registro central de métricas de la aplicación.
 *
 * La instrumentación es parte del objeto de estudio del trabajo, no un extra:
 * la regla 12 de AGENTS.md prohíbe desactivarla "para mejorar el rendimiento".
 *
 * Las métricas se exponen en formato Prometheus en `/api/metricas`, de modo que
 * puedan recolectarse durante las corridas de k6 y cruzarse después con los
 * reportes de carga.
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * En desarrollo, Next.js recarga los módulos en caliente. Sin este resguardo,
 * cada recarga intentaría registrar las mismas métricas otra vez y prom-client
 * lanzaría un error por nombre duplicado.
 */
const global_ = globalThis as unknown as { registroMetricas?: Registry };

function crearRegistro(): Registry {
  const registro = new Registry();

  // Métricas del proceso Node: CPU, memoria residente, event loop, descriptores
  // de archivo. Son la fuente de los indicadores de "utilización de recursos"
  // que exige la Fase 2 del enunciado.
  collectDefaultMetrics({ register: registro, prefix: 'pisada_' });

  return registro;
}

export const registro: Registry = global_.registroMetricas ?? crearRegistro();
global_.registroMetricas = registro;

/**
 * Obtiene una métrica ya registrada o la crea. Necesario por la recarga en
 * caliente de desarrollo, por el mismo motivo explicado arriba.
 */
function obtenerOCrear<T>(nombre: string, crear: () => T): T {
  const existente = registro.getSingleMetric(nombre);
  if (existente) return existente as T;
  return crear();
}

/**
 * Duración de las peticiones HTTP atendidas por la aplicación.
 *
 * Los límites de los baldes están elegidos para que los percentiles p90, p95 y
 * p99 queden bien resueltos en el rango que interesa (decenas a cientos de
 * milisegundos), y para que la cola larga bajo saturación siga siendo visible.
 */
export const duracionPeticion = obtenerOCrear(
  'pisada_peticion_duracion_segundos',
  () =>
    new Histogram({
      name: 'pisada_peticion_duracion_segundos',
      help: 'Duración de las peticiones HTTP, en segundos',
      labelNames: ['ruta', 'metodo', 'estado'] as const,
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [registro],
    }),
);

/**
 * Duración de las consultas a la base de datos, etiquetadas por operación.
 *
 * Separar esta métrica de la anterior permite responder la pregunta central del
 * análisis: cuando el tiempo de respuesta se degrada, ¿es la base de datos o es
 * la aplicación?
 */
export const duracionConsulta = obtenerOCrear(
  'pisada_consulta_duracion_segundos',
  () =>
    new Histogram({
      name: 'pisada_consulta_duracion_segundos',
      help: 'Duración de las consultas a la base de datos, en segundos',
      labelNames: ['operacion'] as const,
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registro],
    }),
);

/**
 * Tiempo de espera para adquirir el bloqueo de stock de una variante.
 *
 * Esta es la métrica más importante del trabajo. Mide directamente la espera en
 * cola sobre el recurso serializado, que es lo que permite aplicar teoría de
 * colas con datos propios en lugar de con un ejemplo de pizarrón.
 */
export const esperaBloqueoStock = obtenerOCrear(
  'pisada_espera_bloqueo_stock_segundos',
  () =>
    new Histogram({
      name: 'pisada_espera_bloqueo_stock_segundos',
      help: 'Tiempo de espera para adquirir el bloqueo de stock de una variante',
      labelNames: ['estrategia'] as const,
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
      registers: [registro],
    }),
);

/** Conteo de peticiones por resultado, para calcular la tasa de error. */
export const peticionesTotal = obtenerOCrear(
  'pisada_peticiones_total',
  () =>
    new Counter({
      name: 'pisada_peticiones_total',
      help: 'Total de peticiones HTTP atendidas',
      labelNames: ['ruta', 'metodo', 'estado'] as const,
      registers: [registro],
    }),
);

/** Intentos de compra que fallaron por falta de stock. Alimenta el análisis del embudo. */
export const comprasSinStock = obtenerOCrear(
  'pisada_compras_sin_stock_total',
  () =>
    new Counter({
      name: 'pisada_compras_sin_stock_total',
      help: 'Intentos de compra rechazados por stock insuficiente',
      registers: [registro],
    }),
);

/** Conexiones en uso del pool de PostgreSQL. Detecta agotamiento del pool. */
export const conexionesPool = obtenerOCrear(
  'pisada_pool_conexiones',
  () =>
    new Gauge({
      name: 'pisada_pool_conexiones',
      help: 'Estado del pool de conexiones a PostgreSQL',
      labelNames: ['estado'] as const,
      registers: [registro],
    }),
);

/**
 * Mide una operación y registra su duración en el histograma indicado.
 * Registra el tiempo tanto si la operación tiene éxito como si falla: ignorar
 * las fallas sesgaría los percentiles justo bajo saturación, que es cuando más
 * importan.
 */
export async function medir<T>(
  histograma: Histogram<string>,
  etiquetas: Record<string, string>,
  operacion: () => Promise<T>,
): Promise<T> {
  const fin = histograma.startTimer(etiquetas);
  try {
    return await operacion();
  } finally {
    fin();
  }
}
