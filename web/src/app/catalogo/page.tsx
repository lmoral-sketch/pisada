/**
 * Catálogo.
 *
 * Página deliberadamente PESADA (regla 11 de AGENTS.md). Ejecuta tres
 * consultas: el listado con agregación sobre variantes, el conteo total para la
 * paginación y las facetas de los filtros. Es la página donde se espera
 * observar primero la degradación bajo carga.
 */

import Link from 'next/link';
import { buscarProductos, obtenerFacetas, type FiltrosCatalogo } from '@/lib/catalogo';
import { medirPagina } from '@/lib/instrumentar';
import { TarjetaProducto } from '@/components/tarjeta-producto';

export const dynamic = 'force-dynamic';

type ParametrosBusqueda = Promise<Record<string, string | string[] | undefined>>;

/** Lee un parámetro de la URL como texto simple. */
function texto(valor: string | string[] | undefined): string | undefined {
  const v = Array.isArray(valor) ? valor[0] : valor;
  return v && v.trim() !== '' ? v.trim() : undefined;
}

/** Construye una URL del catálogo conservando los filtros vigentes. */
function enlaceCon(
  base: Record<string, string | undefined>,
  cambios: Record<string, string | undefined>,
): string {
  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ ...base, ...cambios })) {
    if (valor) parametros.set(clave, valor);
  }
  const consulta = parametros.toString();
  return consulta ? `/catalogo?${consulta}` : '/catalogo';
}

export default async function Catalogo({
  searchParams,
}: {
  searchParams: ParametrosBusqueda;
}) {
  const parametros = await searchParams;

  const filtros: FiltrosCatalogo = {
    categoria: texto(parametros.categoria),
    marca: texto(parametros.marca),
    genero: texto(parametros.genero),
    talla: texto(parametros.talla),
    color: texto(parametros.color),
    busqueda: texto(parametros.q),
    pagina: Number(texto(parametros.pagina) ?? 1),
    porPagina: 24,
  };

  // Filtros vigentes en forma de texto, para reconstruir enlaces.
  const vigentes: Record<string, string | undefined> = {
    categoria: filtros.categoria,
    marca: filtros.marca,
    genero: filtros.genero,
    talla: filtros.talla,
    color: filtros.color,
    q: filtros.busqueda,
  };

  const { productos, total, facetas } = await medirPagina('/catalogo', async () => {
    // Listado y facetas no dependen entre sí: se piden en paralelo para que el
    // tiempo de la página sea el del más lento y no la suma de ambos.
    const [resultado, facetas] = await Promise.all([
      buscarProductos(filtros),
      obtenerFacetas(),
    ]);
    return { ...resultado, facetas };
  });

  const paginaActual = filtros.pagina ?? 1;
  const totalPaginas = Math.max(Math.ceil(total / (filtros.porPagina ?? 24)), 1);
  const hayFiltros = Object.values(vigentes).some(Boolean);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ------------------------------------------------------------------ */}
      {/* Panel de filtros                                                    */}
      {/* ------------------------------------------------------------------ */}
      <aside className="w-full shrink-0 lg:w-56">
        <form action="/catalogo" method="get" className="mb-6">
          <label htmlFor="q" className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={filtros.busqueda ?? ''}
            placeholder="Nombre o modelo"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
        </form>

        {hayFiltros && (
          <Link href="/catalogo" className="mb-4 inline-block text-xs text-neutral-600 underline dark:text-neutral-400">
            Limpiar filtros
          </Link>
        )}

        <GrupoFiltro titulo="Categoría">
          {facetas.categorias.map((c) => (
            <Opcion
              key={c.slug}
              href={enlaceCon(vigentes, {
                categoria: filtros.categoria === c.slug ? undefined : c.slug,
                pagina: undefined,
              })}
              activa={filtros.categoria === c.slug}
            >
              {c.nombre} <span className="text-neutral-400">({c.total})</span>
            </Opcion>
          ))}
        </GrupoFiltro>

        <GrupoFiltro titulo="Marca">
          {facetas.marcas.map((m) => (
            <Opcion
              key={m.slug}
              href={enlaceCon(vigentes, {
                marca: filtros.marca === m.slug ? undefined : m.slug,
                pagina: undefined,
              })}
              activa={filtros.marca === m.slug}
            >
              {m.nombre} <span className="text-neutral-400">({m.total})</span>
            </Opcion>
          ))}
        </GrupoFiltro>

        <GrupoFiltro titulo="Género">
          {['hombre', 'mujer', 'unisex'].map((g) => (
            <Opcion
              key={g}
              href={enlaceCon(vigentes, {
                genero: filtros.genero === g ? undefined : g,
                pagina: undefined,
              })}
              activa={filtros.genero === g}
            >
              <span className="capitalize">{g}</span>
            </Opcion>
          ))}
        </GrupoFiltro>

        <GrupoFiltro titulo="Talla">
          <div className="flex flex-wrap gap-1.5">
            {facetas.tallas.map((t) => (
              <Link
                key={`${t.tipo}-${t.etiqueta}`}
                href={enlaceCon(vigentes, {
                  talla: filtros.talla === t.etiqueta ? undefined : t.etiqueta,
                  pagina: undefined,
                })}
                className={`rounded border px-2 py-1 text-xs ${
                  filtros.talla === t.etiqueta
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
              >
                {t.etiqueta}
              </Link>
            ))}
          </div>
        </GrupoFiltro>

        <GrupoFiltro titulo="Color">
          <div className="flex flex-wrap gap-2">
            {facetas.colores.map((c) => (
              <Link
                key={c.nombre}
                href={enlaceCon(vigentes, {
                  color: filtros.color === c.nombre ? undefined : c.nombre,
                  pagina: undefined,
                })}
                title={c.nombre}
                aria-label={c.nombre}
                className={`h-6 w-6 rounded-full border-2 ${
                  filtros.color === c.nombre
                    ? 'border-neutral-900 dark:border-neutral-100'
                    : 'border-neutral-300 dark:border-neutral-700'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </GrupoFiltro>
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Resultados                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="flex-1">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-xl font-semibold">Catálogo</h1>
          <span className="text-sm text-neutral-500">
            {total} {total === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        {productos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No hay productos que coincidan con estos filtros.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {productos.map((producto) => (
              <TarjetaProducto key={producto.id} producto={producto} />
            ))}
          </div>
        )}

        {totalPaginas > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-3 text-sm">
            {paginaActual > 1 && (
              <Link
                href={enlaceCon(vigentes, { pagina: String(paginaActual - 1) })}
                className="rounded border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"
              >
                Anterior
              </Link>
            )}
            <span className="text-neutral-500">
              Página {paginaActual} de {totalPaginas}
            </span>
            {paginaActual < totalPaginas && (
              <Link
                href={enlaceCon(vigentes, { pagina: String(paginaActual + 1) })}
                className="rounded border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"
              >
                Siguiente
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}

/** Contenedor de un grupo de filtros con su título. */
function GrupoFiltro({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {titulo}
      </h2>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

/** Opción seleccionable de un filtro. */
function Opcion({
  href,
  activa,
  children,
}: {
  href: string;
  activa: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`text-sm ${
        activa
          ? 'font-semibold text-neutral-900 dark:text-neutral-100'
          : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100'
      }`}
    >
      {children}
    </Link>
  );
}
