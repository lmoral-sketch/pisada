/**
 * API de checkout.
 *
 * Endpoint más caliente del sistema: aquí se descuenta el inventario y, por lo
 * tanto, aquí aparece la contención que el trabajo analiza.
 *
 * Los códigos de respuesta están elegidos para que el generador de carga pueda
 * distinguir con precisión qué ocurrió, sin tener que leer el cuerpo:
 *
 *   200 — compra exitosa
 *   409 — stock insuficiente (resultado de negocio legítimo, NO un error)
 *   503 — conflicto por contención extrema, se agotaron los reintentos
 *
 * La distinción importa para el informe: contar los 409 como errores inflaría
 * artificialmente la tasa de error y llevaría a concluir que el sistema falla
 * cuando en realidad está agotando stock, que es lo esperable.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_CARRITO, obtenerItems, obtenerOCrearCarrito } from '@/lib/carrito';
import {
  ESTRATEGIA_POR_DEFECTO,
  procesarCheckout,
  type Estrategia,
} from '@/lib/checkout';
import { duracionPeticion, peticionesTotal } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

function registrar(estado: number, inicio: bigint) {
  const etiquetas = { ruta: '/api/checkout', metodo: 'POST', estado: String(estado) };
  duracionPeticion.observe(etiquetas, Number(process.hrtime.bigint() - inicio) / 1e9);
  peticionesTotal.inc(etiquetas);
}

export async function POST(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const token = request.cookies.get(COOKIE_CARRITO)?.value;

  if (!token) {
    registrar(400, inicio);
    return NextResponse.json({ error: 'No hay carrito' }, { status: 400 });
  }

  // La estrategia puede forzarse por parámetro de consulta para poder correr
  // los mismos escenarios de k6 contra ambas implementaciones y comparar.
  const solicitada = request.nextUrl.searchParams.get('estrategia');
  const estrategia: Estrategia =
    solicitada === 'optimista' || solicitada === 'pesimista'
      ? solicitada
      : ESTRATEGIA_POR_DEFECTO;

  const carritoId = await obtenerOCrearCarrito(token);
  const items = await obtenerItems(carritoId);

  const resultado = await procesarCheckout(carritoId, items, estrategia);

  if (resultado.ok) {
    registrar(200, inicio);
    return NextResponse.json({
      ok: true,
      pedido_id: resultado.pedidoId,
      total_clp: resultado.totalClp,
      estrategia,
      reintentos: resultado.reintentos,
    });
  }

  if (resultado.motivo === 'carrito_vacio') {
    registrar(400, inicio);
    return NextResponse.json({ ok: false, motivo: 'carrito_vacio' }, { status: 400 });
  }

  if (resultado.motivo === 'conflicto') {
    registrar(503, inicio);
    return NextResponse.json(
      { ok: false, motivo: 'conflicto', estrategia },
      { status: 503 },
    );
  }

  registrar(409, inicio);
  return NextResponse.json(
    {
      ok: false,
      motivo: 'sin_stock',
      sku: resultado.sku,
      disponible: resultado.disponible,
      estrategia,
    },
    { status: 409 },
  );
}
