/**
 * Escenario 1 — CARGA BAJA.
 *
 * Propósito: establecer la LÍNEA BASE. Con el sistema holgado, estos tiempos de
 * respuesta son los mejores que la aplicación puede dar. Todo lo que se mida
 * después se interpreta en relación con estos números: sin línea base, decir
 * que algo "demoró 800 ms bajo carga" no significa nada.
 *
 * Ejecución:
 *   k6 run carga/escenarios/baja.js
 *   k6 run -e BASE_URL=https://mi-sitio.onrender.com carga/escenarios/baja.js
 */

import { UMBRALES, sesionDeUsuario } from './comun.js';

export const options = {
  scenarios: {
    carga_baja: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },  // ramp-up suave
        { duration: '3m', target: 5 },   // meseta de observación
        { duration: '30s', target: 0 },  // ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: UMBRALES,
  // Resumen con los percentiles que pide el enunciado. El promedio se incluye
  // solo para mostrar en el informe cuánto engaña frente a la mediana.
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  sesionDeUsuario();
}
