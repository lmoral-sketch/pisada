/**
 * Consultas del catálogo.
 *
 * Las consultas de este módulo están escritas para que su costo sea visible y
 * medible. El listado es deliberadamente más pesado que el home, y el detalle
 * de producto resuelve la matriz completa de tallas y colores.
 */

import { consultar } from './db';

// -----------------------------------------------------------------------------
// Tipos
// -----------------------------------------------------------------------------

export type ProductoListado = {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  genero: string;
  precio_clp: number;
  /** Suma de stock de todas sus variantes. Cero significa agotado. */
  stock_total: number;
  /** Colores disponibles, para la vista previa del listado. */
  colores: string[];
};

export type VarianteDetalle = {
  id: number;
  sku: string;
  talla: string;
  talla_orden: number;
  color: string;
  color_hex: string;
  stock: number;
};

export type ProductoDetalle = {
  id: number;
  slug: string;
  nombre: string;
  marca: string;
  categoria: string;
  categoria_slug: string;
  genero: string;
  precio_clp: number;
  descripcion: string;
  ficha: Record<string, string | number>;
  variantes: VarianteDetalle[];
};

export type FiltrosCatalogo = {
  categoria?: string;
  marca?: string;
  genero?: string;
  talla?: string;
  color?: string;
  busqueda?: string;
  precioMin?: number;
  precioMax?: number;
  pagina?: number;
  porPagina?: number;
};

export type Facetas = {
  categorias: { nombre: string; slug: string; total: number }[];
  marcas: { nombre: string; slug: string; total: number }[];
  colores: { nombre: string; hex: string }[];
  tallas: { etiqueta: string; tipo: string; orden: number }[];
};

// -----------------------------------------------------------------------------
// Consultas
// -----------------------------------------------------------------------------

/**
 * Productos destacados para el home.
 *
 * Es la consulta liviana del sitio: pocas filas, sin filtros y sin agregación
 * sobre variantes más allá del conteo de colores.
 */
export async function obtenerDestacados(limite = 8): Promise<ProductoListado[]> {
  return consultar<ProductoListado>(
    'destacados',
    `SELECT p.id, p.slug, p.nombre, m.nombre AS marca, c.nombre AS categoria,
            p.genero, p.precio_clp,
            COALESCE(SUM(v.stock), 0)::int           AS stock_total,
            ARRAY_AGG(DISTINCT co.codigo_hex)        AS colores
       FROM producto p
       JOIN marca     m  ON m.id  = p.marca_id
       JOIN categoria c  ON c.id  = p.categoria_id
       LEFT JOIN variante v ON v.producto_id = p.id
       LEFT JOIN color    co ON co.id = v.color_id
      WHERE p.destacado
      GROUP BY p.id, m.nombre, c.nombre
      ORDER BY p.creado_en DESC
      LIMIT $1`,
    [limite],
  );
}

/**
 * Listado del catálogo con filtros y paginación.
 *
 * Esta es la consulta pesada del sitio, a propósito (regla 11 de AGENTS.md).
 * Agrupa sobre la tabla de variantes, que es la más grande, y aplica filtros
 * que pueden obligar a recorrerla completa.
 *
 * La búsqueda por nombre usa ILIKE sin índice de texto. Es una decisión
 * deliberada: se mide su costo bajo carga antes de decidir si se agrega un
 * índice GIN con pg_trgm, y el contraste antes/después va en el informe.
 */
export async function buscarProductos(
  filtros: FiltrosCatalogo,
): Promise<{ productos: ProductoListado[]; total: number }> {
  const porPagina = Math.min(filtros.porPagina ?? 24, 96);
  const pagina = Math.max(filtros.pagina ?? 1, 1);
  const desplazamiento = (pagina - 1) * porPagina;

  // Las condiciones se arman con parámetros numerados para evitar por completo
  // la interpolación de valores en el SQL.
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const agregar = (sql: string, valor: unknown) => {
    valores.push(valor);
    condiciones.push(sql.replace('$?', `$${valores.length}`));
  };

  if (filtros.categoria) agregar('c.slug = $?', filtros.categoria);
  if (filtros.marca) agregar('m.slug = $?', filtros.marca);
  if (filtros.genero) agregar('p.genero = $?', filtros.genero);
  if (filtros.precioMin) agregar('p.precio_clp >= $?', filtros.precioMin);
  if (filtros.precioMax) agregar('p.precio_clp <= $?', filtros.precioMax);
  if (filtros.busqueda) agregar('p.nombre ILIKE $?', `%${filtros.busqueda}%`);

  // Los filtros por talla y color se aplican sobre las variantes: el producto
  // califica si tiene al menos una variante con stock en esa talla o color.
  if (filtros.talla) {
    agregar(
      `EXISTS (SELECT 1 FROM variante vt
                 JOIN talla t ON t.id = vt.talla_id
                WHERE vt.producto_id = p.id AND t.etiqueta = $? AND vt.stock > 0)`,
      filtros.talla,
    );
  }
  if (filtros.color) {
    agregar(
      `EXISTS (SELECT 1 FROM variante vc
                 JOIN color cc ON cc.id = vc.color_id
                WHERE vc.producto_id = p.id AND cc.nombre = $? AND vc.stock > 0)`,
      filtros.color,
    );
  }

  const donde = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const productos = await consultar<ProductoListado>(
    'catalogo_listado',
    `SELECT p.id, p.slug, p.nombre, m.nombre AS marca, c.nombre AS categoria,
            p.genero, p.precio_clp,
            COALESCE(SUM(v.stock), 0)::int    AS stock_total,
            ARRAY_AGG(DISTINCT co.codigo_hex) AS colores
       FROM producto p
       JOIN marca     m  ON m.id = p.marca_id
       JOIN categoria c  ON c.id = p.categoria_id
       LEFT JOIN variante v  ON v.producto_id = p.id
       LEFT JOIN color    co ON co.id = v.color_id
       ${donde}
      GROUP BY p.id, m.nombre, c.nombre
      ORDER BY p.id
      LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    [...valores, porPagina, desplazamiento],
  );

  // El conteo total se ejecuta como consulta aparte para poder medir su costo
  // por separado: en catálogos grandes suele ser más caro que el propio listado.
  const [conteo] = await consultar<{ total: string }>(
    'catalogo_conteo',
    `SELECT COUNT(*)::text AS total
       FROM producto p
       JOIN marca     m ON m.id = p.marca_id
       JOIN categoria c ON c.id = p.categoria_id
       ${donde}`,
    valores,
  );

  return { productos, total: Number(conteo?.total ?? 0) };
}

/**
 * Valores disponibles para los filtros del catálogo.
 *
 * Se consulta por separado del listado para poder observar su costo de forma
 * independiente: las facetas agregan sobre toda la tabla de productos.
 */
export async function obtenerFacetas(): Promise<Facetas> {
  const [categorias, marcas, colores, tallas] = await Promise.all([
    consultar<{ nombre: string; slug: string; total: number }>(
      'facetas_categorias',
      `SELECT c.nombre, c.slug, COUNT(p.id)::int AS total
         FROM categoria c
         LEFT JOIN producto p ON p.categoria_id = c.id
        GROUP BY c.id
        ORDER BY c.nombre`,
    ),
    consultar<{ nombre: string; slug: string; total: number }>(
      'facetas_marcas',
      `SELECT m.nombre, m.slug, COUNT(p.id)::int AS total
         FROM marca m
         LEFT JOIN producto p ON p.marca_id = m.id
        GROUP BY m.id
        ORDER BY m.nombre`,
    ),
    consultar<{ nombre: string; hex: string }>(
      'facetas_colores',
      `SELECT nombre, codigo_hex AS hex FROM color ORDER BY nombre`,
    ),
    consultar<{ etiqueta: string; tipo: string; orden: number }>(
      'facetas_tallas',
      `SELECT etiqueta, tipo, orden FROM talla ORDER BY tipo, orden`,
    ),
  ]);

  return { categorias, marcas, colores, tallas };
}

/**
 * Detalle de un producto con su matriz completa de variantes.
 *
 * Peso intermedio: una fila de producto más todas sus variantes (típicamente
 * entre 12 y 30), con sus tallas y colores resueltos.
 */
export async function obtenerProducto(slug: string): Promise<ProductoDetalle | null> {
  const [producto] = await consultar<Omit<ProductoDetalle, 'variantes'>>(
    'producto_detalle',
    `SELECT p.id, p.slug, p.nombre, m.nombre AS marca,
            c.nombre AS categoria, c.slug AS categoria_slug,
            p.genero, p.precio_clp, p.descripcion, p.ficha
       FROM producto p
       JOIN marca     m ON m.id = p.marca_id
       JOIN categoria c ON c.id = p.categoria_id
      WHERE p.slug = $1`,
    [slug],
  );

  if (!producto) return null;

  const variantes = await consultar<VarianteDetalle>(
    'producto_variantes',
    `SELECT v.id, v.sku, t.etiqueta AS talla, t.orden AS talla_orden,
            co.nombre AS color, co.codigo_hex AS color_hex, v.stock
       FROM variante v
       JOIN talla t  ON t.id  = v.talla_id
       JOIN color co ON co.id = v.color_id
      WHERE v.producto_id = $1
      ORDER BY co.nombre, t.orden`,
    [producto.id],
  );

  return { ...producto, variantes };
}

/** Productos de la misma categoría, para la sección de relacionados del detalle. */
export async function obtenerRelacionados(
  categoriaSlug: string,
  excluirId: number,
  limite = 4,
): Promise<ProductoListado[]> {
  return consultar<ProductoListado>(
    'producto_relacionados',
    `SELECT p.id, p.slug, p.nombre, m.nombre AS marca, c.nombre AS categoria,
            p.genero, p.precio_clp,
            COALESCE(SUM(v.stock), 0)::int    AS stock_total,
            ARRAY_AGG(DISTINCT co.codigo_hex) AS colores
       FROM producto p
       JOIN marca     m  ON m.id = p.marca_id
       JOIN categoria c  ON c.id = p.categoria_id
       LEFT JOIN variante v  ON v.producto_id = p.id
       LEFT JOIN color    co ON co.id = v.color_id
      WHERE c.slug = $1 AND p.id <> $2
      GROUP BY p.id, m.nombre, c.nombre
      ORDER BY p.id
      LIMIT $3`,
    [categoriaSlug, excluirId, limite],
  );
}
