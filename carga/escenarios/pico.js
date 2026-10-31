/**
 * Escenario 3 — CARGA PICO Y ESTRÉS.
 *
 * Propósito: encontrar el PUNTO DE SATURACIÓN, que el enunciado pide
 * explícitamente ("¿en qué nivel de carga el sistema empieza a fallar o
 * degradarse?").
 *
 * La carga sube por escalones en lugar de hacerlo de forma continua. Es
 * deliberado: con escalones, cada meseta entrega una medición estable a un
 * nivel de carga conocido, y se puede construir la curva
 * "usuarios concurrentes frente a tiempo de respuesta". Con una rampa continua
 * los puntos quedan mezclados y la curva es difícil de leer.
 *
 * Cómo identificar la saturación en los resultados:
 *  - hasta cierto escalón, el throughput sube y el tiempo de respuesta se
 *    mantiene casi plano: el sistema tiene holgura;
 *  - en el punto de saturación el throughput se APLANA mientras el tiempo de
 *    respuesta empieza a subir: ya no se atienden más peticiones por segundo,
 *    solo se acumula cola;
 *  - más allá, el throughput puede incluso CAER mientras los errores suben.
 *    Eso es colapso, no saturación.
 *
 * Es el comportamiento clásico de un sistema con un recurso saturado, el mismo
 * que describe la teoría de colas de la Unidad 3.
 *
 * Ejecución:
 *   k6 run carga/escenarios/pico.js
 */

import { sesionDeUsuario } from './comun.js';

export const options = {
  scenarios: {
    escalones: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },  { duration: '2m', target: 25 },
        { duration: '30s', target: 50 },  { duration: '2m', target: 50 },
        { duration: '30s', target: 100 }, { duration: '2m', target: 100 },
        { duration: '30s', target: 200 }, { duration: '2m', target: 200 },
        { duration: '30s', target: 350 }, { duration: '2m', target: 350 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '1m',
    },
  },
  /**
   * Sin umbrales de corte.
   *
   * En este escenario el objetivo es justamente llevar el sistema más allá de
   * su límite. Abortar la prueba cuando el p95 se dispara impediría observar
   * qué pasa después del punto de saturación, que es la parte interesante.
   */
  thresholds: {},
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  sesionDeUsuario();
}
