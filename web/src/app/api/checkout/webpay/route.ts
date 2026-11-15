/**
 * Inicia un pago con Transbank Webpay Plus.
 *
 * Camino PARALELO al checkout propio de `/api/checkout`, que sigue intacto y es
 * el que las pruebas de carga ejercitan. Ver `web/src/lib/webpay.ts` para la
 * justificación de mantener ambos.
 *
 * Devuelve el token y la URL del formulario de Transbank. El navegador debe
 * hacer un POST de ese token a esa URL para que el usuario pague.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_CARRITO, calcularTotal, obtenerItems, obtenerOCrearCarrito } from '@/lib/carrito';
import { crearTransaccion } from '@/lib/webpay';
import { duracionPeticion, duracionConsulta, peticionesTotal } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const etiquetas = { ruta: '/api/checkout/webpay', metodo: 'POST', estado: '200' };

  const token = request.cookies.get(COOKIE_CARRITO)?.value;
  if (!token) {
    peticionesTotal.inc({ ...etiquetas, estado: '400' });
    return NextResponse.json({ error: 'No hay carrito' }, { status: 400 });
  }

  const carritoId = await obtenerOCrearCarrito(token);
  const items = await obtenerItems(carritoId);

  if (items.length === 0) {
    peticionesTotal.inc({ ...etiquetas, estado: '400' });
    return NextResponse.json({ ok: false, motivo: 'carrito_vacio' }, { status: 400 });
  }

  const total = calcularTotal(items);

  // La URL de retorno debe ser absoluta y accesible por Transbank. Se deriva
  // del origen de la petición para que funcione igual en local y desplegado.
  const urlRetorno = new URL('/webpay/retorno', request.nextUrl.origin).toString();

  try {
    const transaccion = await crearTransaccion(total, urlRetorno);

    // El costo de la llamada al tercero se registra como una "consulta" más.
    // Es el dato que permite argumentar con evidencia por qué este camino se
    // dejó fuera del que se somete a carga.
    duracionConsulta.observe({ operacion: 'webpay_crear' }, transaccion.medicion.ms / 1000);

    duracionPeticion.observe(etiquetas, Number(process.hrtime.bigint() - inicio) / 1e9);
    peticionesTotal.inc(etiquetas);

    return NextResponse.json({
      ok: true,
      token: transaccion.token,
      url: transaccion.url,
      orden_compra: transaccion.ordenCompra,
      total_clp: total,
      // Se expone para poder mostrarlo en el informe y en el video.
      transbank_ms: Math.round(transaccion.medicion.ms),
    });
  } catch (error) {
    console.error('Error al crear la transacción de Webpay:', error);
    peticionesTotal.inc({ ...etiquetas, estado: '502' });
    return NextResponse.json(
      { ok: false, motivo: 'error_transbank' },
      { status: 502 },
    );
  }
}
