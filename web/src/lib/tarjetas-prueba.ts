/**
 * Tarjetas del ambiente de integración de Transbank.
 *
 * Viven en su propio módulo, sin importar el SDK, porque las consume un
 * componente de cliente. Si estuvieran en `webpay.ts`, el SDK completo de
 * Transbank terminaría en el bundle del navegador: peso inútil para el usuario
 * y, en este proyecto, una distorsión de lo que medimos.
 */

export const TARJETAS_DE_PRUEBA = {
  aprobada: {
    tipo: 'VISA',
    numero: '4051 8856 0044 6623',
    cvv: '123',
    expiracion: 'cualquier fecha futura',
    resultado: 'Pago APROBADO',
  },
  rechazada: {
    tipo: 'MASTERCARD',
    numero: '5186 0595 5959 0568',
    cvv: '123',
    expiracion: 'cualquier fecha futura',
    resultado: 'Pago RECHAZADO',
  },
  // En el formulario de autenticación del banco simulado:
  rut: '11.111.111-1',
  clave: '123',
} as const;
