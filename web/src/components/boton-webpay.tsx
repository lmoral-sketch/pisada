'use client';

/**
 * Pago con Transbank Webpay Plus.
 *
 * Webpay exige que el navegador haga un **POST del token** a la URL que entrega
 * Transbank; no sirve una redirección simple con GET. Por eso se construye un
 * formulario y se envía mediante JavaScript.
 *
 * Convive con el botón de pago propio: son dos caminos distintos, y el de
 * arriba es el que las pruebas de carga ejercitan.
 */

import { useState } from 'react';
import type { ItemCarrito } from '@/lib/carrito';
import { iniciarCheckout, type ArticuloGA } from '@/lib/ga';
import { TARJETAS_DE_PRUEBA } from '@/lib/tarjetas-prueba';

export function BotonWebpay({ items, totalClp }: { items: ItemCarrito[]; totalClp: number }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verTarjetas, setVerTarjetas] = useState(false);

  async function alPagar() {
    if (enviando) return;
    setEnviando(true);
    setError(null);

    // Tercer paso del embudo, igual que en el pago propio.
    const articulos: ArticuloGA[] = items.map((i) => ({
      item_id: i.sku,
      item_name: i.producto,
      item_brand: i.marca,
      item_variant: `${i.color} / ${i.talla}`,
      price: i.precio_clp,
      quantity: i.cantidad,
    }));
    iniciarCheckout(articulos, totalClp);

    try {
      const respuesta = await fetch('/api/checkout/webpay', { method: 'POST' });
      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.ok) {
        setError('No se pudo iniciar el pago con Webpay. Intenta de nuevo.');
        setEnviando(false);
        return;
      }

      // Webpay requiere POST del token. Se arma el formulario y se envía.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = datos.url;
      const campo = document.createElement('input');
      campo.type = 'hidden';
      campo.name = 'token_ws';
      campo.value = datos.token;
      form.appendChild(campo);
      document.body.appendChild(form);
      form.submit();
    } catch {
      setError('Error de conexión con Transbank.');
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={alPagar}
        disabled={enviando}
        className="rounded-md border-2 border-neutral-900 px-5 py-3 text-sm font-medium transition enabled:hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-100 dark:enabled:hover:bg-neutral-900"
      >
        {enviando ? 'Redirigiendo a Transbank...' : 'Pagar con Webpay'}
      </button>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setVerTarjetas(!verTarjetas)}
        className="self-start text-xs text-neutral-600 underline dark:text-neutral-400"
      >
        {verTarjetas ? 'Ocultar' : 'Ver'} tarjetas de prueba
      </button>

      {verTarjetas && (
        <div className="rounded-md border border-neutral-200 p-3 text-xs dark:border-neutral-800">
          <p className="mb-2 text-neutral-600 dark:text-neutral-400">
            Ambiente de integración de Transbank. <strong>No uses una tarjeta real.</strong>
          </p>
          <dl className="space-y-2">
            <Tarjeta datos={TARJETAS_DE_PRUEBA.aprobada} />
            <Tarjeta datos={TARJETAS_DE_PRUEBA.rechazada} />
          </dl>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            En el banco simulado: RUT <code className="font-mono">{TARJETAS_DE_PRUEBA.rut}</code>,
            clave <code className="font-mono">{TARJETAS_DE_PRUEBA.clave}</code>
          </p>
        </div>
      )}
    </div>
  );
}

function Tarjeta({
  datos,
}: {
  datos: { tipo: string; numero: string; cvv: string; resultado: string };
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-neutral-500">{datos.resultado}</dt>
      <dd className="text-right font-mono">
        {datos.tipo} {datos.numero} · CVV {datos.cvv}
      </dd>
    </div>
  );
}
