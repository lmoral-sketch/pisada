/**
 * Escenario 4 — CONTENCIÓN SOBRE UN MISMO SKU.
 *
 * Este escenario no estaba en la lista mínima del enunciado (que pide baja,
 * sostenida y pico), pero es el que produce el hallazgo central del trabajo.
 *
 * POR QUÉ EXISTE
 *
 * En los otros escenarios los usuarios compran productos distintos, elegidos al
 * azar entre cientos. Con un catálogo grande, la probabilidad de que dos
 * usuarios compren exactamente la misma combinación de producto, talla y color
 * al mismo tiempo es ínfima. Resultado: el bloqueo de stock nunca se disputa, y
 * toda la contención que el sistema puede exhibir queda invisible.
 *
 * Eso no sería un error del sistema, sino del generador: estaríamos midiendo un
 * escenario que no ejerce el recurso crítico.
 *
 * Este escenario corrige eso haciendo que TODOS los usuarios virtuales compitan
 * por la MISMA variante, como ocurre de verdad en un lanzamiento, una
 * liquidación o una preventa. Es ahí donde el recurso serializado se convierte
 * en cuello de botella y aparece la espera en cola.
 *
 * QUÉ OBSERVAR
 *
 *  - `pisada_checkout_duracion` frente al mismo valor en carga normal: la
 *    diferencia es el costo de la contención.
 *  - `pisada_espera_bloqueo_stock_segundos` en /api/metricas: es el tiempo de
 *    espera en cola propiamente tal, el dato para la Unidad 3.
 *  - `pisada_sin_stock`: crece a medida que el inventario se agota. Es
 *    esperable, no es una falla.
 *  - `pisada_reintentos`: solo con estrategia optimista. Si crece más rápido
 *    que linealmente con los usuarios virtuales, la estrategia se está
 *    degradando.
 *
 * CÓMO CORRERLO
 *
 * Hay que indicar la variante en disputa. Para obtener una con stock alto:
 *
 *   docker compose exec postgres psql -U pisada -d pisada -c \
 *     "SELECT id, sku, stock FROM variante ORDER BY stock DESC LIMIT 5;"
 *
 * Luego, una corrida por estrategia, para poder compararlas:
 *
 *   k6 run -e VARIANTE_ID=123 -e ESTRATEGIA=pesimista carga/escenarios/contencion.js
 *   k6 run -e VARIANTE_ID=456 -e ESTRATEGIA=optimista carga/escenarios/contencion.js
 *
 * IMPORTANTE: usar una variante DISTINTA para cada corrida, o reponer el stock
 * entre ambas. Si la segunda corrida parte con el inventario que agotó la
 * primera, medirá puros 409 y la comparación no valdrá nada.
 */

import http from 'k6/http';
import { check } from 'k6';
import {
  BASE,
  ESTRATEGIA,
  compras,
  conflictos,
  duracionCheckout,
  pensar,
  reintentos,
  sinStock,
  tasaConversion,
} from './comun.js';

const VARIANTE_ID = Number(__ENV.VARIANTE_ID || 0);

export const options = {
  scenarios: {
    contencion: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Escalones cortos: la contención se manifiesta de inmediato, no
        // requiere mesetas largas como las degradaciones progresivas.
        { duration: '15s', target: 10 }, { duration: '45s', target: 10 },
        { duration: '15s', target: 30 }, { duration: '45s', target: 30 },
        { duration: '15s', target: 60 }, { duration: '45s', target: 60 },
        { duration: '15s', target: 120 }, { duration: '45s', target: 120 },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {},
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export function setup() {
  if (!VARIANTE_ID) {
    throw new Error(
      'Falta VARIANTE_ID. Ejemplo: k6 run -e VARIANTE_ID=123 carga/escenarios/contencion.js',
    );
  }
  console.log(
    `Contención sobre la variante ${VARIANTE_ID}, estrategia: ${ESTRATEGIA || 'por defecto'}`,
  );
}

export default function () {
  // Cada usuario virtual tiene su propio frasco de cookies, así que opera su
  // propio carrito. Lo único compartido es la variante en disputa, que es
  // exactamente la condición que queremos provocar.
  const agregado = http.post(
    `${BASE}/api/carrito`,
    JSON.stringify({ variante_id: VARIANTE_ID, cantidad: 1 }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { pagina: 'api_carrito', esperado: 'si' },
    },
  );
  check(agregado, { 'agregar responde 200': (r) => r.status === 200 });

  // Think time muy corto: en un lanzamiento la gente no delibera, va directo al
  // pago. Alargarlo dispersaría los intentos en el tiempo y diluiría justamente
  // la simultaneidad que buscamos.
  pensar(0.2, 1);

  const consulta = ESTRATEGIA ? `?estrategia=${ESTRATEGIA}` : '';
  const pago = http.post(`${BASE}/api/checkout${consulta}`, null, {
    tags: { pagina: 'api_checkout', esperado: 'no' },
  });

  duracionCheckout.add(pago.timings.duration);

  if (pago.status === 200) {
    compras.add(1);
    tasaConversion.add(true);
    try {
      const cuerpo = pago.json();
      if (cuerpo && cuerpo.reintentos) reintentos.add(cuerpo.reintentos);
    } catch (_) {
      // Sin cuerpo interpretable: no invalida la iteración.
    }
  } else if (pago.status === 409) {
    sinStock.add(1);
    tasaConversion.add(false);
  } else if (pago.status === 503) {
    conflictos.add(1);
    tasaConversion.add(false);
  } else {
    tasaConversion.add(false);
  }

  pensar(0.5, 2);
}
