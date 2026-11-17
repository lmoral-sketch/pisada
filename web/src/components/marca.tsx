/**
 * Identidad de Pisada: logotipo e ilustración de producto.
 *
 * TODO ES SVG EN LÍNEA, A PROPÓSITO.
 *
 * El trabajo mide el desempeño del sitio, y las mediciones del informe se
 * tomaron sin archivos de imagen. Agregar fotos reales sumaría peticiones de
 * red, peso de transferencia y tiempos de descarga que no controlamos,
 * invalidando los números ya publicados y contaminando los Core Web Vitals.
 *
 * El SVG en línea viaja dentro del HTML: cero peticiones adicionales, cero
 * latencia de red, y el peso queda bajo nuestro control y es medible.
 */

/** Marca de Pisada: una huella de zapatilla estilizada. */
export function Logotipo({ tamano = 28 }: { tamano?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        width={tamano}
        height={tamano}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Suela: perfil lateral de una zapatilla */}
        <path
          d="M3 21c0-1.2.6-2.1 1.7-2.6l4.6-2c.7-.3 1.3-.9 1.6-1.6l1.9-4.4c.4-1 1.4-1.6 2.5-1.5 1 .1 1.9.8 2.2 1.8l.6 2c.2.8.9 1.4 1.7 1.5l5 .8c2 .3 3.5 2 3.5 4.1V21c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3Z"
          className="fill-neutral-900 dark:fill-neutral-100"
        />
        {/* Franja lateral, el detalle que la hace leer como zapatilla */}
        <path
          d="M11.3 14.8 6.5 17c-.6.3-1 .8-1.2 1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="text-[#00B6ED]"
        />
        {/* Piso */}
        <rect x="3" y="25.5" width="26" height="1.8" rx=".9" className="fill-[#00B6ED]" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Pisada</span>
    </span>
  );
}
