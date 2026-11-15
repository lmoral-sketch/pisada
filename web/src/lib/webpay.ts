/**
 * Integración con Transbank Webpay Plus, ambiente de integración.
 *
 * ESTE ES UN CAMINO PARALELO, NO UN REEMPLAZO.
 *
 * El checkout propio (`/api/checkout`) sigue siendo el camino que las pruebas de
 * carga ejercitan y que el informe analiza. Webpay se agrega como una segunda
 * vía de pago por dos razones:
 *
 *  1. El enunciado pide explícitamente "sandbox de algún medio de pago
 *     disponible en Chile".
 *  2. Permite MEDIR cuánto cuesta una llamada a un tercero, y con ese dato
 *     justificar con evidencia por qué se dejó fuera del camino analizado.
 *
 * Por qué no reemplaza al checkout propio: Webpay opera por redirección a un
 * sitio externo con formulario. k6 es un cliente HTTP y no puede completar ese
 * flujo, de modo que reemplazarlo invalidaría el escenario de contención, que
 * es el núcleo del trabajo.
 *
 * Credenciales: el SDK incluye las de INTEGRACIÓN, que son públicas y
 * documentadas por Transbank. No hay dinero real involucrado y no se deben usar
 * jamás credenciales de producción en este proyecto.
 */

import {
  WebpayPlus,
  Options,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
  Environment,
} from 'transbank-sdk';

/** Duración de la llamada a Transbank, para poder reportarla en el informe. */
export type MedicionWebpay = {
  ms: number;
  operacion: 'crear' | 'confirmar';
};

/** Configuración del ambiente de integración. */
function opciones() {
  return new Options(
    IntegrationCommerceCodes.WEBPAY_PLUS,
    // La constante de la clave se llama WEBPAY, no WEBPAY_PLUS: el SDK no usa
    // el mismo sufijo para el código de comercio y para la clave.
    IntegrationApiKeys.WEBPAY,
    Environment.Integration,
  );
}

export type TransaccionCreada = {
  token: string;
  url: string;
  ordenCompra: string;
  medicion: MedicionWebpay;
};

/**
 * Crea una transacción en Webpay y devuelve el token y la URL del formulario.
 *
 * El flujo de Webpay Plus es:
 *   1. El comercio crea la transacción (esta función)
 *   2. El navegador hace POST del token a la URL de Transbank
 *   3. El usuario paga en el sitio de Transbank
 *   4. Transbank redirige de vuelta a `urlRetorno`
 *   5. El comercio confirma la transacción (`confirmarTransaccion`)
 *
 * @param montoClp    Monto en pesos chilenos, sin decimales.
 * @param urlRetorno  URL absoluta a la que Transbank devolverá al usuario.
 */
export async function crearTransaccion(
  montoClp: number,
  urlRetorno: string,
): Promise<TransaccionCreada> {
  // La orden de compra y el identificador de sesión deben ser únicos por
  // transacción. Transbank los devuelve al confirmar, así que sirven para
  // reconciliar con nuestro propio pedido.
  const ordenCompra = `PSD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const idSesion = `SES-${Date.now()}`;

  const inicio = process.hrtime.bigint();
  const transaccion = new WebpayPlus.Transaction(opciones());
  const respuesta = await transaccion.create(ordenCompra, idSesion, montoClp, urlRetorno);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

  return {
    token: respuesta.token,
    url: respuesta.url,
    ordenCompra,
    medicion: { ms, operacion: 'crear' },
  };
}

export type TransaccionConfirmada = {
  aprobada: boolean;
  ordenCompra: string;
  montoClp: number;
  codigoAutorizacion: string | null;
  codigoRespuesta: number;
  tarjetaUltimos4: string | null;
  medicion: MedicionWebpay;
};

/**
 * Confirma una transacción tras el retorno desde Transbank.
 *
 * **Este paso es obligatorio.** Si el comercio no confirma, Transbank revierte
 * el cargo automáticamente. Es el equivalente al COMMIT de una transacción de
 * base de datos: el pago no está cerrado hasta que ambas partes lo acuerdan.
 *
 * `response_code` igual a 0 significa aprobada; cualquier otro valor es rechazo.
 */
export async function confirmarTransaccion(token: string): Promise<TransaccionConfirmada> {
  const inicio = process.hrtime.bigint();
  const transaccion = new WebpayPlus.Transaction(opciones());
  const r = await transaccion.commit(token);
  const ms = Number(process.hrtime.bigint() - inicio) / 1e6;

  return {
    aprobada: r.response_code === 0,
    ordenCompra: r.buy_order,
    montoClp: r.amount,
    codigoAutorizacion: r.authorization_code ?? null,
    codigoRespuesta: r.response_code,
    tarjetaUltimos4: r.card_detail?.card_number ?? null,
    medicion: { ms, operacion: 'confirmar' },
  };
}
