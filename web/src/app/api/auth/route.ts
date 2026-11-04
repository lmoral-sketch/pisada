/**
 * API de autenticación.
 *
 *   POST   /api/auth?accion=registro  — crea una cuenta e inicia sesión
 *   POST   /api/auth?accion=ingreso   — inicia sesión
 *   DELETE /api/auth                  — cierra sesión
 *   GET    /api/auth                  — devuelve el usuario de la sesión actual
 *
 * Igual que el carrito y el checkout, se expone como REST para que el
 * generador de carga pueda ejercitar estas rutas (decisión D-06).
 *
 * NOTA DE DESEMPEÑO: el registro y el ingreso derivan la contraseña con scrypt,
 * que es intencionalmente costoso en CPU. Bajo carga, estas rutas compiten por
 * procesador con el resto del sitio. Es un cuello de botella de naturaleza
 * distinta al del stock —ahí el recurso escaso es un bloqueo de fila, acá es la
 * CPU— y por eso conviene medirlas por separado.
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  COOKIE_SESION,
  autenticar,
  cerrarSesion,
  crearSesion,
  crearUsuario,
  usuarioDeSesion,
  validarRegistro,
  vincularCarrito,
} from '@/lib/auth';
import { COOKIE_CARRITO } from '@/lib/carrito';
import { duracionPeticion, peticionesTotal } from '@/lib/metricas';

export const dynamic = 'force-dynamic';

function registrar(metodo: string, estado: number, inicio: bigint, accion = '') {
  const etiquetas = {
    ruta: `/api/auth${accion ? `:${accion}` : ''}`,
    metodo,
    estado: String(estado),
  };
  duracionPeticion.observe(etiquetas, Number(process.hrtime.bigint() - inicio) / 1e9);
  peticionesTotal.inc(etiquetas);
}

/** Opciones comunes de la cookie de sesión. */
const COOKIE = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

/** GET: usuario de la sesión actual, o null. */
export async function GET(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const token = request.cookies.get(COOKIE_SESION)?.value;

  if (!token) {
    registrar('GET', 200, inicio);
    return NextResponse.json({ usuario: null });
  }

  const usuario = await usuarioDeSesion(token);
  registrar('GET', 200, inicio);
  return NextResponse.json({ usuario });
}

/** POST: registro o ingreso, según el parámetro `accion`. */
export async function POST(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const accion = request.nextUrl.searchParams.get('accion') ?? 'ingreso';

  let cuerpo: { email?: unknown; clave?: unknown; nombre?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    registrar('POST', 400, inicio, accion);
    return NextResponse.json({ error: 'Cuerpo JSON inválido' }, { status: 400 });
  }

  const email = String(cuerpo.email ?? '');
  const clave = String(cuerpo.clave ?? '');
  const nombre = String(cuerpo.nombre ?? '');

  if (accion === 'registro') {
    const error = validarRegistro(email, clave, nombre);
    if (error) {
      registrar('POST', 400, inicio, accion);
      return NextResponse.json({ error }, { status: 400 });
    }

    const usuario = await crearUsuario(email, clave, nombre);
    if (!usuario) {
      // 409: el correo ya existe. Es un conflicto, no un error del servidor.
      registrar('POST', 409, inicio, accion);
      return NextResponse.json(
        { error: 'Ese correo ya está registrado.' },
        { status: 409 },
      );
    }

    const token = await crearSesion(usuario.id);

    // Si el visitante ya tenía carrito como anónimo, se conserva.
    const tokenCarrito = request.cookies.get(COOKIE_CARRITO)?.value;
    if (tokenCarrito) await vincularCarrito(tokenCarrito, usuario.id);

    const respuesta = NextResponse.json({ ok: true, usuario });
    respuesta.cookies.set(COOKIE_SESION, token, COOKIE);
    registrar('POST', 200, inicio, accion);
    return respuesta;
  }

  // Ingreso
  const usuario = await autenticar(email, clave);
  if (!usuario) {
    // El mensaje es deliberadamente genérico: distinguir "no existe el correo"
    // de "la contraseña es incorrecta" revelaría qué correos están registrados.
    registrar('POST', 401, inicio, accion);
    return NextResponse.json(
      { error: 'Correo o contraseña incorrectos.' },
      { status: 401 },
    );
  }

  const token = await crearSesion(usuario.id);
  const tokenCarrito = request.cookies.get(COOKIE_CARRITO)?.value;
  if (tokenCarrito) await vincularCarrito(tokenCarrito, usuario.id);

  const respuesta = NextResponse.json({ ok: true, usuario });
  respuesta.cookies.set(COOKIE_SESION, token, COOKIE);
  registrar('POST', 200, inicio, accion);
  return respuesta;
}

/** DELETE: cierra la sesión. */
export async function DELETE(request: NextRequest) {
  const inicio = process.hrtime.bigint();
  const token = request.cookies.get(COOKIE_SESION)?.value;
  if (token) await cerrarSesion(token);

  const respuesta = NextResponse.json({ ok: true });
  respuesta.cookies.set(COOKIE_SESION, '', { ...COOKIE, maxAge: 0 });

  registrar('DELETE', 200, inicio);
  return respuesta;
}
