/**
 * Exposición de métricas en formato Prometheus.
 *
 * Durante las corridas de carga, este endpoint se consulta periódicamente para
 * registrar la utilización de recursos del servidor (CPU, memoria, event loop)
 * junto con las métricas propias de la aplicación. Es la fuente de los
 * indicadores del lado servidor que exige la Fase 2 del enunciado.
 *
 * El endpoint no se incluye en el análisis del embudo ni se somete a carga: su
 * propósito es observar, no ser observado.
 */

import { registro } from '@/lib/metricas';

// Las métricas deben reflejar el estado actual del proceso, nunca una respuesta
// cacheada.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cuerpo = await registro.metrics();

  return new Response(cuerpo, {
    status: 200,
    headers: {
      'Content-Type': registro.contentType,
      'Cache-Control': 'no-store',
    },
  });
}
