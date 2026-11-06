/**
 * Pisada — Generador del catálogo semilla.
 *
 * Crea un catálogo de tamaño realista con variantes de talla y color.
 * El tamaño importa para el trabajo: un catálogo de diez productos no produce
 * listados pesados ni contención observable. Por defecto genera 240 productos,
 * que derivan en varios miles de SKU.
 *
 * Uso:
 *   node db/semilla.mjs              # usa PRODUCTOS por defecto
 *   PRODUCTOS=500 node db/semilla.mjs
 *
 * Requiere la variable de entorno DATABASE_URL.
 *
 * Las marcas son ficticias a propósito: el sitio es un ejercicio académico y
 * no debe presentarse como tienda de marcas reales.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const aquí = dirname(fileURLToPath(import.meta.url));

const CANTIDAD_PRODUCTOS = Number(process.env.PRODUCTOS ?? 240);

// -----------------------------------------------------------------------------
// Datos base del catálogo
// -----------------------------------------------------------------------------

const MARCAS = [
  'Andara', 'Volcán', 'Kirke', 'Nortada', 'Suela Viva',
  'Paso Doble', 'Brisa', 'Cordillera Co.', 'Tramo', 'Ruta 7',
];

const CATEGORIAS = [
  { nombre: 'Zapatillas urbanas', slug: 'zapatillas-urbanas', tipoTalla: 'calzado' },
  { nombre: 'Zapatillas de running', slug: 'zapatillas-running', tipoTalla: 'calzado' },
  { nombre: 'Zapatillas de trail', slug: 'zapatillas-trail', tipoTalla: 'calzado' },
  { nombre: 'Poleras', slug: 'poleras', tipoTalla: 'vestuario' },
  { nombre: 'Polerones', slug: 'polerones', tipoTalla: 'vestuario' },
  { nombre: 'Pantalones', slug: 'pantalones', tipoTalla: 'vestuario' },
  { nombre: 'Chaquetas', slug: 'chaquetas', tipoTalla: 'vestuario' },
];

const COLORES = [
  { nombre: 'Negro', hex: '#1a1a1a' },
  { nombre: 'Blanco', hex: '#f5f5f5' },
  { nombre: 'Gris piedra', hex: '#8a8a8a' },
  { nombre: 'Azul noche', hex: '#1e3a5f' },
  { nombre: 'Verde musgo', hex: '#4a5d3a' },
  { nombre: 'Rojo ladrillo', hex: '#a33c2a' },
  { nombre: 'Arena', hex: '#d4c5a9' },
  { nombre: 'Naranjo', hex: '#e07a3c' },
];

// Tallas de calzado (números chilenos) y de vestuario.
const TALLAS_CALZADO = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const TALLAS_VESTUARIO = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const GENEROS = ['hombre', 'mujer', 'unisex'];

// Palabras para componer nombres de modelo variados pero coherentes.
const LINEAS = [
  'Altiplano', 'Cauce', 'Duna', 'Estero', 'Farellón', 'Grieta', 'Horizonte',
  'Istmo', 'Jornada', 'Ladera', 'Meseta', 'Nevado', 'Oasis', 'Pampa',
  'Quebrada', 'Rompiente', 'Sendero', 'Talud', 'Umbral', 'Vertiente',
];
const SUFIJOS = ['', ' II', ' III', ' Pro', ' Lite', ' GTX', ' Clásico', ' Trail', ' Eco', ' Max'];

const MATERIALES = ['Malla reciclada', 'Cuero sintético', 'Algodón orgánico', 'Nylon ripstop', 'Gamuza', 'Poliéster reciclado'];
const USOS = ['Uso diario', 'Entrenamiento', 'Montaña', 'Running en asfalto', 'Casual', 'Trabajo'];

// -----------------------------------------------------------------------------
// Generador pseudoaleatorio con semilla fija
// -----------------------------------------------------------------------------
// Se usa una semilla fija para que el catálogo sea REPRODUCIBLE. Si cada
// ejecución generara datos distintos, dos corridas de carga no serían
// comparables entre sí y el análisis perdería validez.

let semilla = 20262;
function aleatorio() {
  semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
  return semilla / 0x7fffffff;
}
const entre = (min, max) => min + Math.floor(aleatorio() * (max - min + 1));
const elegir = (lista) => lista[Math.floor(aleatorio() * lista.length)];

/** Convierte un texto en un slug apto para URL. */
function aSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// -----------------------------------------------------------------------------
// Carga
// -----------------------------------------------------------------------------

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta la variable de entorno DATABASE_URL.');
    process.exit(1);
  }

  const cliente = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();

  console.log('Aplicando el esquema...');
  await cliente.query(readFileSync(join(aquí, 'esquema.sql'), 'utf8'));

  // --- Dimensiones ---------------------------------------------------------

  console.log('Cargando marcas, categorías, tallas y colores...');

  const idMarca = new Map();
  for (const nombre of MARCAS) {
    const { rows } = await cliente.query(
      'INSERT INTO marca (nombre, slug) VALUES ($1, $2) RETURNING id',
      [nombre, aSlug(nombre)],
    );
    idMarca.set(nombre, rows[0].id);
  }

  const idCategoria = new Map();
  for (const cat of CATEGORIAS) {
    const { rows } = await cliente.query(
      'INSERT INTO categoria (nombre, slug) VALUES ($1, $2) RETURNING id',
      [cat.nombre, cat.slug],
    );
    idCategoria.set(cat.slug, rows[0].id);
  }

  // Las tallas se insertan con un orden explícito para poder presentarlas
  // correctamente en la matriz de tallas del detalle de producto.
  const tallasPorTipo = { calzado: [], vestuario: [] };
  for (const [i, etiqueta] of TALLAS_CALZADO.entries()) {
    const { rows } = await cliente.query(
      'INSERT INTO talla (etiqueta, tipo, orden) VALUES ($1, $2, $3) RETURNING id',
      [etiqueta, 'calzado', i],
    );
    tallasPorTipo.calzado.push(rows[0].id);
  }
  for (const [i, etiqueta] of TALLAS_VESTUARIO.entries()) {
    const { rows } = await cliente.query(
      'INSERT INTO talla (etiqueta, tipo, orden) VALUES ($1, $2, $3) RETURNING id',
      [etiqueta, 'vestuario', i],
    );
    tallasPorTipo.vestuario.push(rows[0].id);
  }

  const idColor = [];
  for (const color of COLORES) {
    const { rows } = await cliente.query(
      'INSERT INTO color (nombre, codigo_hex) VALUES ($1, $2) RETURNING id',
      [color.nombre, color.hex],
    );
    idColor.push(rows[0].id);
  }

  // --- Productos y variantes -----------------------------------------------

  console.log(`Generando ${CANTIDAD_PRODUCTOS} productos con sus variantes...`);

  const slugsUsados = new Set();
  let totalVariantes = 0;

  for (let n = 0; n < CANTIDAD_PRODUCTOS; n++) {
    const categoria = elegir(CATEGORIAS);
    const marca = elegir(MARCAS);
    const linea = elegir(LINEAS);
    const sufijo = elegir(SUFIJOS);
    const nombre = `${marca} ${linea}${sufijo}`;

    // Garantiza unicidad del slug sin depender del azar.
    let slug = aSlug(nombre);
    if (slugsUsados.has(slug)) slug = `${slug}-${n}`;
    slugsUsados.add(slug);

    const esCalzado = categoria.tipoTalla === 'calzado';
    const precio = esCalzado ? entre(34, 159) * 1000 + 990 : entre(12, 69) * 1000 + 990;

    const ficha = {
      material: elegir(MATERIALES),
      uso: elegir(USOS),
      peso_g: esCalzado ? entre(240, 420) : entre(150, 700),
      origen: elegir(['Importado', 'Confección nacional']),
      garantia_meses: 6,
      cuidados: 'Lavar a mano con agua fría. No usar secadora.',
      ...(esCalzado ? { drop_mm: entre(4, 12), tipo_pisada: elegir(['Neutra', 'Pronadora', 'Supinadora']) } : {}),
    };

    const { rows } = await cliente.query(
      `INSERT INTO producto
         (slug, nombre, marca_id, categoria_id, genero, precio_clp, descripcion, ficha, destacado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        slug,
        nombre,
        idMarca.get(marca),
        idCategoria.get(categoria.slug),
        elegir(GENEROS),
        precio,
        `${nombre}. ${ficha.uso}. Confeccionado en ${ficha.material.toLowerCase()}.`,
        JSON.stringify(ficha),
        n % 12 === 0, // aproximadamente un 8% de destacados para el home
      ],
    );
    const productoId = rows[0].id;

    // Cada producto se ofrece en 2 o 3 colores, en todas las tallas de su tipo.
    const tallas = tallasPorTipo[categoria.tipoTalla];
    const coloresDelProducto = [];
    while (coloresDelProducto.length < entre(2, 3)) {
      const c = elegir(idColor);
      if (!coloresDelProducto.includes(c)) coloresDelProducto.push(c);
    }

    // Las variantes de un producto se insertan en UNA sola sentencia.
    //
    // No es microoptimización: contra una base remota, cada consulta cuesta un
    // viaje de ida y vuelta completo. Con inserciones de a una, sembrar 4552
    // variantes contra Neon en Ohio tomaba unos 11 minutos frente a 8 segundos
    // en local. Agrupando por producto, el número de viajes baja de 4552 a 240.
    const valores = [];
    const marcadores = [];
    for (const colorId of coloresDelProducto) {
      for (const tallaId of tallas) {
        // Un 12% de las combinaciones nace sin stock: es realista y genera
        // puntos de abandono medibles en el embudo de conversión.
        const stock = aleatorio() < 0.12 ? 0 : entre(1, 40);
        const i = valores.length;
        marcadores.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
        valores.push(
          productoId,
          tallaId,
          colorId,
          `PSD-${productoId}-${tallaId}-${colorId}`,
          stock,
        );
        totalVariantes++;
      }
    }

    await cliente.query(
      `INSERT INTO variante (producto_id, talla_id, color_id, sku, stock)
       VALUES ${marcadores.join(', ')}`,
      valores,
    );
  }

  // --- Resumen -------------------------------------------------------------

  const { rows: resumen } = await cliente.query(`
    SELECT
      (SELECT COUNT(*) FROM producto) AS productos,
      (SELECT COUNT(*) FROM variante) AS variantes,
      (SELECT COUNT(*) FROM variante WHERE stock = 0) AS sin_stock,
      (SELECT SUM(stock) FROM variante) AS unidades
  `);

  console.log('\nCatálogo generado:');
  console.table(resumen[0]);
  console.log(`Variantes insertadas en esta corrida: ${totalVariantes}`);

  await cliente.end();
}

main().catch((error) => {
  console.error('Error al generar la semilla:', error);
  process.exit(1);
});
