/**
 * Ingreso y registro de usuario.
 *
 * Una sola página con ambos formularios, alternables. Mantener el registro y el
 * ingreso en la misma ruta simplifica el flujo y evita una navegación extra en
 * el embudo.
 */

import { cookies } from 'next/headers';
import { COOKIE_SESION, usuarioDeSesion } from '@/lib/auth';
import { medirPagina } from '@/lib/instrumentar';
import { FormularioCuenta } from '@/components/formulario-cuenta';

export const dynamic = 'force-dynamic';

export default async function Cuenta() {
  const token = (await cookies()).get(COOKIE_SESION)?.value;

  const usuario = await medirPagina('/cuenta', async () => {
    if (!token) return null;
    return usuarioDeSesion(token);
  });

  return (
    <div className="mx-auto max-w-sm py-10">
      <FormularioCuenta usuarioInicial={usuario} />
    </div>
  );
}
