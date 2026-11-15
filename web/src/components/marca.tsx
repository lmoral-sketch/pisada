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

/**
 * Ilustración de un producto, derivada de su propio color.
 *
 * Dibuja una zapatilla de perfil. No es una foto ni pretende serlo: es un
 * marcador visual consistente que identifica el producto por su color sin
 * costar una petición de red.
 *
 * @param hex      Color de la variante, que define el cuerpo de la zapatilla.
 * @param semilla  Entero que introduce pequeñas variaciones de forma, para que
 *                 dos productos distintos no se vean idénticos.
 */
export function IlustracionProducto({
  hex,
  semilla = 0,
  className = '',
}: {
  hex: string;
  semilla?: number;
  className?: string;
}) {
  // Variaciones deterministas: el mismo producto se ve siempre igual, lo que
  // importa para que las capturas del informe sean reproducibles.
  const v = semilla % 4;
  const alturaCana = 30 + v * 3;   // más o menos "bota"
  const id = `grad-${semilla}`;

  return (
    <svg
      viewBox="0 0 170 105"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="1" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.78" />
        </linearGradient>
      </defs>

      {/* Sombra de apoyo */}
      <ellipse cx="86" cy="97" rx="60" ry="4" fill="#000" opacity="0.08" />

      {/* Capellada: punta baja a la izquierda, caña alta a la derecha */}
      <path
        d={`M16 84
            C16 72 26 65 40 62
            L96 50
            C104 48 110 43 113 36
            L117 ${alturaCana}
            C120 23 127 20 134 22
            C142 24 146 31 146 39
            L146 84 Z`}
        fill={`url(#${id})`}
      />

      {/* Collar acolchado del tobillo */}
      <path
        d={`M117 ${alturaCana} C124 ${alturaCana - 4} 134 ${alturaCana - 3} 143 ${alturaCana + 4}`}
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />

      {/* Franja lateral curva, el rasgo que la hace leer como zapatilla */}
      <path
        d="M30 78 C52 74 76 66 100 57"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
        opacity="0.45"
      />

      {/* Cordones sobre el empeine */}
      {[0, 1, 2].map((k) => (
        <path
          key={k}
          d={`M${97 - k * 11} ${54 + k * 3} l10 -5`}
          stroke="#fff"
          strokeWidth="2.8"
          strokeLinecap="round"
          opacity="0.75"
        />
      ))}

      {/* Suela, en dos tonos */}
      <path d="M12 84 h138 a6 6 0 0 1 6 6 v2 a4 4 0 0 1-4 4 H10 a4 4 0 0 1-4-4 v-2 a6 6 0 0 1 6-6 Z" fill="#fff" />
      <path d="M12 84 h138 a6 6 0 0 1 6 6 H6 a6 6 0 0 1 6-6 Z" fill={hex} opacity="0.3" />
    </svg>
  );
}
