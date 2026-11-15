/**
 * Retorno desde Transbank tras el pago.
 *
 * Transbank devuelve al usuario a esta URL con el token de la transacción.
 * Aquí se **confirma** el pago, paso obligatorio: si el comercio no confirma,
 * Transbank revierte el cargo automáticamente.
 *
 * Solo si la confirmación resulta aprobada se descuenta el inventario y se crea
 * el pedido, reutilizando exactamente la misma lógica transaccional que el
 * checkout propio. El medio de pago cambia; el control de concurrencia no.
 */

import Link from 'next/link';
import { cookies } from 'next/headers';
import { COOKIE_CARRITO, obtenerItems, obtenerOCrearCarrito } from '@/lib/carrito';
import { procesarCheckout } from '@/lib/checkout';
import { confirmarTransaccion } from '@/lib/webpay';
import { medirPagina } from '@/lib/instrumentar';
import { precio } from '@/lib/formato';

export const dynamic = 'force-dynamic';

type Parametros = Promise<Record<string, string | string[] | undefined>>;

export default async function RetornoWebpay({
  searchParams,
}: {
  searchParams: Parametros;
}) {
  const p = await searchParams;
  const token = typeof p.token_ws === 'string' ? p.token_ws : undefined;

  // Transbank devuelve TBK_TOKEN en vez de token_ws cuando el usuario anula el
  // pago desde el formulario. Son casos distintos y hay que distinguirlos.
  const anulada = typeof p.TBK_TOKEN === 'string';

  const resultado = await medirPagina('/webpay/retorno', async () => {
    if (anulada) return { tipo: 'anulada' as const };
    if (!token) return { tipo: 'sin_token' as const };

    const confirmacion = await confirmarTransaccion(token);

    if (!confirmacion.aprobada) {
      return { tipo: 'rechazada' as const, confirmacion };
    }

    // Pago aprobado: recién ahora se descuenta inventario y se crea el pedido,
    // con el mismo control de concurrencia del checkout propio.
    const tokenCarrito = (await cookies()).get(COOKIE_CARRITO)?.value;
    if (!tokenCarrito) return { tipo: 'sin_carrito' as const, confirmacion };

    const carritoId = await obtenerOCrearCarrito(tokenCarrito);
    const items = await obtenerItems(carritoId);
    const pedido = await procesarCheckout(carritoId, items);

    return { tipo: 'aprobada' as const, confirmacion, pedido };
  });

  return (
    <div className="mx-auto max-w-lg py-12">
      {resultado.tipo === 'aprobada' && resultado.pedido.ok && (
        <Panel
          tono="exito"
          titulo="¡Pago confirmado!"
          detalle={`Pedido N° ${resultado.pedido.pedidoId} por ${precio(resultado.pedido.totalClp)}.`}
        >
          <Dato etiqueta="Orden de compra" valor={resultado.confirmacion.ordenCompra} />
          <Dato etiqueta="Código de autorización" valor={resultado.confirmacion.codigoAutorizacion ?? '—'} />
          <Dato etiqueta="Tarjeta" valor={`···· ${resultado.confirmacion.tarjetaUltimos4 ?? '····'}`} />
          <Dato etiqueta="Tiempo de respuesta de Transbank" valor={`${Math.round(resultado.confirmacion.medicion.ms)} ms`} />
        </Panel>
      )}

      {resultado.tipo === 'aprobada' && !resultado.pedido.ok && (
        <Panel
          tono="aviso"
          titulo="El pago se aprobó, pero no quedó stock"
          detalle="Transbank autorizó el cargo y el inventario se agotó mientras pagabas. En un comercio real correspondería revertir la transacción."
        >
          <Dato etiqueta="Orden de compra" valor={resultado.confirmacion.ordenCompra} />
        </Panel>
      )}

      {resultado.tipo === 'rechazada' && (
        <Panel
          tono="error"
          titulo="Pago rechazado"
          detalle="El banco no autorizó la transacción. No se descontó inventario ni se creó el pedido."
        >
          <Dato etiqueta="Código de respuesta" valor={String(resultado.confirmacion.codigoRespuesta)} />
        </Panel>
      )}

      {resultado.tipo === 'anulada' && (
        <Panel tono="aviso" titulo="Pago anulado" detalle="Cancelaste el pago en el formulario de Transbank. Tu carrito sigue intacto." />
      )}

      {(resultado.tipo === 'sin_token' || resultado.tipo === 'sin_carrito') && (
        <Panel tono="error" titulo="No se pudo procesar el retorno" detalle="Falta información de la transacción. Vuelve al carrito e intenta de nuevo." />
      )}

      <div className="mt-6 flex gap-3">
        <Link href="/catalogo" className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900">
          Seguir comprando
        </Link>
        <Link href="/carrito" className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm dark:border-neutral-700">
          Ver carrito
        </Link>
      </div>

      <p className="mt-8 text-xs text-neutral-500">
        Pago procesado en el <strong>ambiente de integración</strong> de Transbank Webpay Plus.
        No se mueve dinero real.
      </p>
    </div>
  );
}

/** Panel de resultado con el tono según el desenlace. */
function Panel({
  tono,
  titulo,
  detalle,
  children,
}: {
  tono: 'exito' | 'error' | 'aviso';
  titulo: string;
  detalle: string;
  children?: React.ReactNode;
}) {
  const estilos = {
    exito: 'border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950',
    error: 'border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950',
    aviso: 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950',
  }[tono];

  return (
    <div className={`rounded-lg border p-6 ${estilos}`}>
      <h1 className="text-lg font-semibold">{titulo}</h1>
      <p className="mt-2 text-sm">{detalle}</p>
      {children && <dl className="mt-4 space-y-1 border-t border-current/15 pt-3">{children}</dl>}
    </div>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <dt className="opacity-70">{etiqueta}</dt>
      <dd className="font-mono">{valor}</dd>
    </div>
  );
}
