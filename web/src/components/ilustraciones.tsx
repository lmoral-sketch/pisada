/**
 * Ilustraciones de producto, una por categoría.
 *
 * TODO ES SVG EN LÍNEA, A PROPÓSITO (ver decisión D-09).
 *
 * Las cifras del informe se midieron sin archivos de imagen. Una foto por
 * producto sumaría 24 peticiones de red en el catálogo, peso fuera de nuestro
 * control y degradación de los Core Web Vitals, invalidando los números ya
 * publicados. El SVG viaja dentro del HTML que ya se sirve: cero peticiones
 * adicionales y peso medible.
 *
 * Cada categoría tiene su propia silueta, y dentro de calzado hay tres modelos
 * distintos (urbana, running, trail) para que el catálogo no se vea repetitivo.
 */

type Props = {
  /** Slug de la categoría, define qué prenda se dibuja. */
  categoria: string;
  /** Color de la variante. */
  hex: string;
  /** Entero que introduce variaciones deterministas de forma. */
  semilla?: number;
  className?: string;
};

/** Pinta la prenda que corresponde a la categoría del producto. */
export function IlustracionProducto({ categoria, hex, semilla = 0, className = '' }: Props) {
  const id = `g${semilla}`;
  const comun = { hex, id, v: semilla % 4 };

  const dibujo =
    categoria.includes('running') ? <Running {...comun} />
    : categoria.includes('trail') ? <Trail {...comun} />
    : categoria.includes('zapatilla') ? <Urbana {...comun} />
    : categoria.includes('polerón') || categoria.includes('poleron') ? <Poleron {...comun} />
    : categoria.includes('polera') ? <Polera {...comun} />
    : categoria.includes('pantalon') || categoria.includes('pantalón') ? <Pantalon {...comun} />
    : categoria.includes('chaqueta') ? <Chaqueta {...comun} />
    : <Urbana {...comun} />;

  return (
    <svg viewBox="0 0 170 130" className={className} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="1" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <ellipse cx="85" cy="122" rx="56" ry="4" fill="#000" opacity="0.08" />
      {dibujo}
    </svg>
  );
}

type Sub = { hex: string; id: string; v: number };

/* ── CALZADO ──────────────────────────────────────────────────────────── */

/** Zapatilla urbana: perfil bajo, caña corta. */
function Urbana({ hex, id, v }: Sub) {
  const cana = 46 + v * 2;
  return (
    <g>
      <path
        d={`M18 100 C18 88 28 81 42 78 L98 66 C106 64 112 59 115 52
            L119 ${cana} C122 39 129 36 136 38 C144 40 148 47 148 55 L148 100 Z`}
        fill={`url(#${id})`}
      />
      <path d={`M119 ${cana} C126 ${cana - 4} 136 ${cana - 3} 145 ${cana + 4}`}
        stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M32 94 C54 90 78 82 102 73" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.42" />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${99 - k * 11} ${70 + k * 3} l10 -5`} stroke="#fff" strokeWidth="2.8" strokeLinecap="round" opacity="0.7" />
      ))}
      <Suela hex={hex} />
    </g>
  );
}

/** Zapatilla de running: más estilizada, con mediasuela gruesa. */
function Running({ hex, id, v }: Sub) {
  const cana = 44 + v * 2;
  return (
    <g>
      <path
        d={`M14 96 C14 84 26 76 40 73 L96 60 C105 58 111 53 114 46
            L118 ${cana} C121 33 129 30 137 33 C146 36 150 44 150 53 L150 96 Z`}
        fill={`url(#${id})`}
      />
      {/* Mediasuela, el rasgo distintivo del running */}
      <path d="M12 96 h146 a8 8 0 0 1 8 8 v3 H4 v-3 a8 8 0 0 1 8-8 Z" fill="#fff" opacity="0.92" />
      <path d="M20 103 h130" stroke={hex} strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <path d="M28 88 C52 83 78 74 104 64" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M58 82 l14 -5 M74 77 l14 -5" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${98 - k * 10} ${64 + k * 3} l9 -4`} stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
      ))}
      <rect x="4" y="107" width="162" height="6" rx="3" fill={hex} opacity="0.3" />
    </g>
  );
}

/** Zapatilla de trail: robusta, con tacos en la suela. */
function Trail({ hex, id, v }: Sub) {
  const cana = 40 + v * 2;
  return (
    <g>
      <path
        d={`M16 94 C16 80 28 72 42 69 L94 56 C104 53 110 48 113 41
            L117 ${cana} C120 28 128 24 137 27 C147 31 151 40 151 50 L151 94 Z`}
        fill={`url(#${id})`}
      />
      {/* Refuerzo de puntera */}
      <path d="M16 94 C16 84 22 77 32 73 L46 69 L46 94 Z" fill="#fff" opacity="0.22" />
      <path d="M30 86 C54 80 80 70 106 59" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.45" />
      <path d={`M117 ${cana} C125 ${cana - 5} 137 ${cana - 3} 147 ${cana + 5}`}
        stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Suela con tacos */}
      <path d="M10 94 h150 a6 6 0 0 1 6 6 v4 H4 v-4 a6 6 0 0 1 6-6 Z" fill="#fff" opacity="0.9" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <rect key={k} x={14 + k * 19} y="104" width="11" height="6" rx="2" fill={hex} opacity="0.55" />
      ))}
    </g>
  );
}

/** Suela plana, compartida por la zapatilla urbana. */
function Suela({ hex }: { hex: string }) {
  return (
    <g>
      <path d="M12 100 h146 a6 6 0 0 1 6 6 v2 a4 4 0 0 1-4 4 H10 a4 4 0 0 1-4-4 v-2 a6 6 0 0 1 6-6 Z" fill="#fff" opacity="0.92" />
      <path d="M12 100 h146 a6 6 0 0 1 6 6 H6 a6 6 0 0 1 6-6 Z" fill={hex} opacity="0.28" />
    </g>
  );
}

/* ── VESTUARIO ────────────────────────────────────────────────────────── */

/** Polera: manga corta, cuello redondo. */
function Polera({ hex, id, v }: Sub) {
  const manga = 54 + v * 2;
  return (
    <g>
      <path
        d={`M58 22 L46 28 L26 44 L38 60 L48 52 L48 112 L122 112 L122 52 L132 60 L144 44 L124 28 L112 22
            C108 32 96 36 85 36 C74 36 62 32 58 22 Z`}
        fill={`url(#${id})`}
      />
      {/* Cuello */}
      <path d="M58 22 C66 31 76 34 85 34 C94 34 104 31 112 22" stroke="#fff" strokeWidth="4" fill="none" opacity="0.55" strokeLinecap="round" />
      {/* Caída de las mangas */}
      <path d={`M48 ${manga} L48 112`} stroke="#fff" strokeWidth="2" opacity="0.2" />
      <path d={`M122 ${manga} L122 112`} stroke="#fff" strokeWidth="2" opacity="0.2" />
      {/* Pliegue central */}
      <path d="M85 40 L85 108" stroke="#fff" strokeWidth="1.5" opacity="0.13" />
    </g>
  );
}

/** Polerón: capucha, manga larga y bolsillo canguro. */
function Poleron({ hex, id, v }: Sub) {
  const largo = 112 + v;
  return (
    <g>
      <path
        d={`M56 26 L40 32 L22 50 L34 66 L44 58 L44 ${largo} L126 ${largo} L126 58 L136 66 L148 50 L130 32 L114 26 Z`}
        fill={`url(#${id})`}
      />
      {/* Capucha */}
      <path d="M62 26 C66 14 78 8 85 8 C92 8 104 14 108 26 C100 34 92 37 85 37 C78 37 70 34 62 26 Z"
        fill={hex} opacity="0.92" />
      <path d="M62 26 C70 33 78 36 85 36 C92 36 100 33 108 26" stroke="#fff" strokeWidth="3.5" fill="none" opacity="0.5" strokeLinecap="round" />
      {/* Cordones */}
      <path d="M78 34 L76 48 M92 34 L94 48" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      {/* Bolsillo canguro */}
      <path d={`M60 ${largo - 34} L62 ${largo - 10} L108 ${largo - 10} L110 ${largo - 34} Z`}
        fill="#fff" opacity="0.18" />
      <path d={`M60 ${largo - 34} L62 ${largo - 10} L108 ${largo - 10} L110 ${largo - 34}`}
        stroke="#fff" strokeWidth="2" fill="none" opacity="0.35" />
      {/* Puños */}
      <rect x="22" y="50" width="0" height="0" />
      <path d={`M44 ${largo - 8} L126 ${largo - 8}`} stroke="#fff" strokeWidth="3" opacity="0.25" />
    </g>
  );
}

/** Pantalón: dos piernas con tiro y bolsillos. */
function Pantalon({ hex, id, v }: Sub) {
  const ancho = v % 2 === 0 ? 0 : 3; // recto o levemente acampanado
  return (
    <g>
      <path
        d={`M50 16 L120 16 L124 44 L${122 + ancho} 116 L96 116 L88 58 L82 58 L74 116 L${48 - ancho} 116 L46 44 Z`}
        fill={`url(#${id})`}
      />
      {/* Cintura */}
      <path d="M50 16 L120 16 L121 25 L49 25 Z" fill="#fff" opacity="0.22" />
      <path d="M49 25 L121 25" stroke="#fff" strokeWidth="2" opacity="0.4" />
      {/* Bragueta */}
      <path d="M85 25 L85 52" stroke="#fff" strokeWidth="2" opacity="0.3" strokeLinecap="round" />
      {/* Bolsillos */}
      <path d="M56 28 C60 36 64 38 68 38" stroke="#fff" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
      <path d="M114 28 C110 36 106 38 102 38" stroke="#fff" strokeWidth="2" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* Bastas */}
      <path d={`M${48 - ancho} 110 L74 110 M96 110 L${122 + ancho} 110`} stroke="#fff" strokeWidth="2.5" opacity="0.25" />
    </g>
  );
}

/** Chaqueta: cuello, cierre central y bolsillos laterales. */
function Chaqueta({ hex, id, v }: Sub) {
  const largo = 110 + v * 2;
  return (
    <g>
      <path
        d={`M56 24 L38 30 L20 50 L32 66 L42 58 L42 ${largo} L128 ${largo} L128 58 L138 66 L150 50 L132 30 L114 24 Z`}
        fill={`url(#${id})`}
      />
      {/* Solapas del cuello */}
      <path d="M56 24 L85 44 L114 24 L106 20 L85 32 L64 20 Z" fill="#fff" opacity="0.3" />
      {/* Cierre central */}
      <path d={`M85 44 L85 ${largo - 4}`} stroke="#fff" strokeWidth="3" opacity="0.55" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <circle key={k} cx="85" cy={54 + k * 10} r="1.6" fill={hex} opacity="0.6" />
      ))}
      {/* Bolsillos */}
      <rect x="52" y={largo - 40} width="22" height="4" rx="2" fill="#fff" opacity="0.35" />
      <rect x="96" y={largo - 40} width="22" height="4" rx="2" fill="#fff" opacity="0.35" />
      {/* Elástico inferior */}
      <path d={`M42 ${largo - 8} L128 ${largo - 8}`} stroke="#fff" strokeWidth="3" opacity="0.25" />
    </g>
  );
}
