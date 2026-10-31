/**
 * Utilidades de formato.
 *
 * La moneda del proyecto es el peso chileno, que no usa decimales.
 */

const FORMATO_CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Formatea un monto en pesos chilenos. Ej.: 45990 → "$45.990". */
export function precio(montoClp: number): string {
  return FORMATO_CLP.format(montoClp);
}

/** Convierte la clave de un campo de la ficha en una etiqueta legible. */
export function etiquetaCampo(clave: string): string {
  const etiquetas: Record<string, string> = {
    material: 'Material',
    uso: 'Uso recomendado',
    peso_g: 'Peso',
    origen: 'Origen',
    garantia_meses: 'Garantía',
    cuidados: 'Cuidados',
    drop_mm: 'Drop',
    tipo_pisada: 'Tipo de pisada',
  };
  return etiquetas[clave] ?? clave;
}

/** Agrega la unidad correspondiente al valor de un campo de la ficha. */
export function valorCampo(clave: string, valor: string | number): string {
  if (clave === 'peso_g') return `${valor} g`;
  if (clave === 'drop_mm') return `${valor} mm`;
  if (clave === 'garantia_meses') return `${valor} meses`;
  return String(valor);
}
