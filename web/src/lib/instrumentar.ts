/**
 * Instrumentación del tiempo de renderizado de las páginas.
 *
 * k6 mide el tiempo de respuesta desde el cliente, que es la cifra autoritativa
 * para los percentiles del informe. Esta medición es complementaria y responde
 * una pregunta distinta: del tiempo total que percibe el usuario, cuánto se
 * gastó efectivamente dentro del servidor. La diferencia entre ambas revela el
 * tiempo de encolamiento y de red.
 */

import { duracionPeticion, peticionesTotal } from './metricas';

/**
 * Envuelve el trabajo de una página y registra cuánto demoró.
 *
 * @param ruta Identificador estable de la ruta, de cardinalidad baja.
 *             Debe ser el patrón ('/producto/[slug]'), nunca la URL concreta:
 *             usar la URL haría explotar la cardinalidad de las etiquetas.
 */
export async function medirPagina<T>(ruta: string, trabajo: () => Promise<T>): Promise<T> {
  const inicio = process.hrtime.bigint();
  let estado = '200';

  try {
    return await trabajo();
  } catch (error) {
    estado = '500';
    throw error;
  } finally {
    const segundos = Number(process.hrtime.bigint() - inicio) / 1e9;
    const etiquetas = { ruta, metodo: 'GET', estado };
    duracionPeticion.observe(etiquetas, segundos);
    peticionesTotal.inc(etiquetas);
  }
}
