/**
 * Compara el costo de las mismas consultas contra dos bases distintas.
 *
 * Sirve para separar, en el informe, qué parte del tiempo de respuesta es
 * trabajo real de la base y qué parte es latencia de red. Por la **ley general
 * del tiempo de respuesta** (`R = Σ Vᵢ · Rᵢ`), la red es una estación de
 * servicio más y debe declararse por separado, no atribuirse a la aplicación.
 *
 * Uso:
 *   node db/medir-latencia.mjs <url_a> <etiqueta_a> <url_b> <etiqueta_b>
 *
 * Para no exponer credenciales en la línea de comandos, las URL pueden pasarse
 * por variables de entorno:
 *   URL_A=... URL_B=... node db/medir-latencia.mjs
 */

import pg from 'pg';

const REPETICIONES = 7;

/**
 * Consultas representativas del sitio, de menor a mayor costo de cómputo.
 *
 * `SELECT 1` casi no cuesta trabajo en el servidor: su tiempo es
 * esencialmente el viaje de ida y vuelta. Sirve de **línea base de red** para
 * descontarla de las demás.
 */
const CONSULTAS = [
  ['SELECT 1 (solo red)', 'SELECT 1'],
  ['conteo de productos', 'SELECT COUNT(*) FROM producto'],
  [
    'listado con agregacion',
    `SELECT p.id, COALESCE(SUM(v.stock), 0)::int AS stock
       FROM producto p
       LEFT JOIN variante v ON v.producto_id = p.id
      GROUP BY p.id
      ORDER BY p.id
      LIMIT 24`,
  ],
  [
    'conteo del catalogo',
    `SELECT COUNT(*) FROM producto p
       JOIN marca m ON m.id = p.marca_id
       JOIN categoria c ON c.id = p.categoria_id`,
  ],
];

/** Ejecuta la batería contra una base y devuelve las medianas. */
async function medir(etiqueta, url) {
  const cliente = new pg.Client({ connectionString: url });

  const inicio = process.hrtime.bigint();
  await cliente.connect();
  const msConexion = Number(process.hrtime.bigint() - inicio) / 1e6;

  const resultados = { etiqueta, conexion: msConexion, consultas: {} };

  for (const [nombre, sql] of CONSULTAS) {
    const tiempos = [];
    for (let i = 0; i < REPETICIONES; i++) {
      const a = process.hrtime.bigint();
      await cliente.query(sql);
      tiempos.push(Number(process.hrtime.bigint() - a) / 1e6);
    }
    tiempos.sort((x, y) => x - y);
    // Mediana: descarta el primer acceso, que suele incluir el despertar del
    // compute en planes que suspenden por inactividad.
    resultados.consultas[nombre] = tiempos[Math.floor(tiempos.length / 2)];
  }

  await cliente.end();
  return resultados;
}

async function main() {
  const urlA = process.env.URL_A ?? process.argv[2];
  const etiquetaA = process.env.ETIQUETA_A ?? process.argv[3] ?? 'A';
  const urlB = process.env.URL_B ?? process.argv[4];
  const etiquetaB = process.env.ETIQUETA_B ?? process.argv[5] ?? 'B';

  if (!urlA || !urlB) {
    console.error('Faltan las dos cadenas de conexión. Ver el encabezado del archivo.');
    process.exit(1);
  }

  const a = await medir(etiquetaA, urlA);
  const b = await medir(etiquetaB, urlB);

  console.log(`\n${'consulta'.padEnd(26)} ${etiquetaA.padStart(12)} ${etiquetaB.padStart(12)} ${'factor'.padStart(9)}`);
  console.log('-'.repeat(63));
  console.log(
    `${'conectar'.padEnd(26)} ${a.conexion.toFixed(1).padStart(10)}ms ${b.conexion.toFixed(1).padStart(10)}ms ${(b.conexion / a.conexion).toFixed(1).padStart(8)}x`,
  );
  for (const [nombre] of CONSULTAS) {
    const ta = a.consultas[nombre];
    const tb = b.consultas[nombre];
    console.log(
      `${nombre.padEnd(26)} ${ta.toFixed(1).padStart(10)}ms ${tb.toFixed(1).padStart(10)}ms ${(tb / ta).toFixed(1).padStart(8)}x`,
    );
  }

  // La diferencia entre una consulta y SELECT 1 es el trabajo real del
  // servidor, ya descontado el viaje de red.
  const redA = a.consultas['SELECT 1 (solo red)'];
  const redB = b.consultas['SELECT 1 (solo red)'];
  console.log(`\nTrabajo del servidor, descontada la red (consulta − SELECT 1):`);
  for (const [nombre] of CONSULTAS.slice(1)) {
    console.log(
      `  ${nombre.padEnd(26)} ${(a.consultas[nombre] - redA).toFixed(1).padStart(8)}ms ${(b.consultas[nombre] - redB).toFixed(1).padStart(10)}ms`,
    );
  }
}

main().catch((error) => {
  console.error('Error al medir:', error.message);
  process.exit(1);
});
