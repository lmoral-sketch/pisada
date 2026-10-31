/**
 * API del carrito.
 *
 * Se expone como REST, y no como Server Action de Next.js, de forma deliberada:
 * las Server Actions se invocan con un identificador cifrado que cambia en cada
 * compilación y exigen cabeceras internas del framework, lo que impide que k6
 * las ejecute de manera estable. Con endpoints REST, el generador de carga
 * recorre el mismo embudo que un cliente real.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  COOKIE_CARRITO,
  agregarItem,
  calcularTotal,
  nuevoToken,
  obtenerItems,
  obtenerOCrearCarrito,
  quitarItem,
} from '@/lib/carrito';
import { duracionPeticion, peticionesTotal } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

/** Registra la duración y el resultado de la petición en las métricas. */
function registrar(metodo: string, estado: number, inicio: bigint) {
  const etiquetas = { ruta: '/api/carrito', metodo, estado: String(estado) };
  duracionPeticion.observe(etiquetas, Number(process.hrtime.bigint() - inicio) / 1e9);
  peticionesTotal.inc(etiquetas);
}

/**
 * GET: contenido actual del carrito.
 * Usado por el generador de carga para verificar el estado entre pasos.
 */
export async function GET(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const token = request.cookies.get(COOKIE_CARRITO)?.value;

  if (!token) {
    registrar('GET', 200, inicio);
    return NextResponse.json({ items: [], total_clp: 0 });
  }

  const carritoId = await obtenerOCrearCarrito(token);
  const items = await obtenerItems(carritoId);

  registrar('GET', 200, inicio);
  return NextResponse.json({ items, total_clp: calcularTotal(items) });
}

/**
 * POST: agrega una variante al carrito.
 * Cuerpo esperado: { "variante_id": number, "cantidad"?: number }
 */
export async function POST(request: NextRequest) {
  const inicio = process.hrtime.bigint();

  let cuerpo: { variante_id?: unknown; cantidad?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    registrar('POST', 400, inicio);
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const varianteId = Number(cuerpo.variante_id);
  const cantidad = Number(cuerpo.cantidad ?? 1);

  if (!Number.isInteger(varianteId) || varianteId <= 0) {
    registrar('POST', 400, inicio);
    return NextResponse.json({ error: 'variante_id inválido' }, { status: 400 });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 10) {
    registrar('POST', 400, inicio);
    return NextResponse.json({ error: 'cantidad inválida' }, { status: 400 });
  }

  // Si el visitante no trae cookie, se le asigna un carrito nuevo.
  const token = request.cookies.get(COOKIE_CARRITO)?.value ?? nuevoToken();
  const carritoId = await obtenerOCrearCarrito(token);

  await agregarItem(carritoId, varianteId, cantidad);
  const items = await obtenerItems(carritoId);

  const respuesta = NextResponse.json({
    ok: true,
    items,
    total_clp: calcularTotal(items),
  });

  respuesta.cookies.set(COOKIE_CARRITO, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  registrar('POST', 200, inicio);
  return respuesta;
}

/**
 * DELETE: quita una variante del carrito.
 * Cuerpo esperado: { "variante_id": number }
 */
export async function DELETE(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const token = request.cookies.get(COOKIE_CARRITO)?.value;

  if (!token) {
    registrar('DELETE', 404, inicio);
    return NextResponse.json({ error: 'No hay carrito' }, { status: 404 });
  }

  let cuerpo: { variante_id?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    registrar('DELETE', 400, inicio);
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const varianteId = Number(cuerpo.variante_id);
  if (!Number.isInteger(varianteId) || varianteId <= 0) {
    registrar('DELETE', 400, inicio);
    return NextResponse.json({ error: 'variante_id inválido' }, { status: 400 });
  }

  const carritoId = await obtenerOCrearCarrito(token);
  await quitarItem(carritoId, varianteId);
  const items = await obtenerItems(carritoId);

  registrar('DELETE', 200, inicio);
  return NextResponse.json({ ok: true, items, total_clp: calcularTotal(items) });
}
