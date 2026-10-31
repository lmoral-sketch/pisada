/**
 * Escenario 2 — CARGA SOSTENIDA NORMAL.
 *
 * Propósito: representar un día de operación habitual. La meseta es larga a
 * propósito, porque hay degradaciones que NO aparecen en pruebas cortas:
 * fugas de memoria, crecimiento de la cola del pool de conexiones, tablas que
 * se van llenando de pedidos.
 *
 * Al leer los resultados, comparar el primer minuto de meseta contra el último.
 * Si el p95 subió sin que subiera la carga, hay una degradación progresiva y
 * eso es un hallazgo para el informe.
 *
 * Ejecución:
 *   k6 run carga/escenarios/normal.js
 */

import { UMBRALES, sesionDeUsuario } from './comun.js';

export const options = {
  scenarios: {
    carga_normal: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 25 },  // ramp-up progresivo
        { duration: '8m', target: 25 },  // meseta larga: busca degradación lenta
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: UMBRALES,
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  sesionDeUsuario();
}
