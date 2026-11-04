/**
 * Autenticación de usuarios.
 *
 * Se usa `scrypt` del módulo `node:crypto` en lugar de una librería externa
 * como bcrypt o argon2. Dos razones:
 *
 *  1. Regla 7 de AGENTS.md: no agregar dependencias sin justificación. Cada
 *     librería suma peso al despliegue y, en este proyecto, el peso es
 *     exactamente lo que estamos midiendo.
 *  2. `scrypt` es una función de derivación de clave diseñada contra ataques de
 *     fuerza bruta por hardware, y viene en la biblioteca estándar de Node.
 *
 * NOTA DE DESEMPEÑO, relevante para el informe: derivar una clave es
 * DELIBERADAMENTE costoso en CPU. Es su propósito de seguridad. Eso significa
 * que el registro y el inicio de sesión son, por diseño, las operaciones más
 * caras del sitio en términos de procesador, y bajo carga compiten por CPU con
 * el resto de las peticiones. Es un cuello de botella distinto al del stock: ahí
 * el recurso escaso es un bloqueo de fila; acá es el procesador.
 */

import { randomBytes, scrypt, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { consultar } from './db';

const derivar = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
) => Promise<Buffer>;

export const COOKIE_SESION = 'pisada_sesion';

/** Largo en bytes de la sal y de la clave derivada. */
const LARGO_SAL = 16;
const LARGO_CLAVE = 32;

export type Usuario = {
  id: number;
  email: string;
  nombre: string;
};

/**
 * Deriva la contraseña y la almacena junto a su sal.
 *
 * Formato: `sal_en_hex:clave_en_hex`. Guardar la sal junto al hash es la
 * práctica correcta: su propósito no es ser secreta, sino impedir que dos
 * usuarios con la misma contraseña produzcan el mismo hash y que sirvan tablas
 * precalculadas.
 */
export async function derivarClave(clave: string): Promise<string> {
  const sal = randomBytes(LARGO_SAL);
  const derivada = await derivar(clave, sal, LARGO_CLAVE);
  return `${sal.toString('hex')}:${derivada.toString('hex')}`;
}

/**
 * Verifica una contraseña contra su hash almacenado.
 *
 * La comparación usa `timingSafeEqual`, que tarda lo mismo sin importar en qué
 * byte difieren los valores. Una comparación normal (`===`) se detiene en la
 * primera diferencia, y ese tiempo variable permitiría a un atacante deducir el
 * hash byte a byte midiendo la demora de las respuestas.
 */
export async function verificarClave(clave: string, almacenado: string): Promise<boolean> {
  const [salHex, claveHex] = almacenado.split(':');
  if (!salHex || !claveHex) return false;

  const sal = Buffer.from(salHex, 'hex');
  const esperada = Buffer.from(claveHex, 'hex');
  const obtenida = await derivar(clave, sal, esperada.length);

  if (obtenida.length !== esperada.length) return false;
  return timingSafeEqual(obtenida, esperada);
}

/** Reglas mínimas de validación. Devuelve el error, o null si está bien. */
export function validarRegistro(
  email: string,
  clave: string,
  nombre: string,
): string | null {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return 'El correo no es válido.';
  }
  if (!clave || clave.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (!nombre || nombre.trim().length < 2) {
    return 'Indica tu nombre.';
  }
  return null;
}

/**
 * Crea un usuario.
 *
 * @returns El usuario creado, o null si el correo ya está registrado.
 */
export async function crearUsuario(
  email: string,
  clave: string,
  nombre: string,
): Promise<Usuario | null> {
  const hash = await derivarClave(clave);

  // ON CONFLICT DO NOTHING evita tener que consultar primero y insertar
  // después, que bajo concurrencia podría permitir dos registros simultáneos
  // del mismo correo entre la consulta y la inserción.
  const filas = await consultar<Usuario>(
    'usuario_crear',
    `INSERT INTO usuario (email, clave_hash, nombre)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, nombre`,
    [email.toLowerCase().trim(), hash, nombre.trim()],
  );

  return filas[0] ?? null;
}

/**
 * Valida las credenciales de un usuario.
 *
 * Cuando el correo no existe se deriva igualmente una clave contra un hash
 * ficticio. Sin eso, la respuesta sería notoriamente más rápida para correos
 * inexistentes, y esa diferencia de tiempo permitiría averiguar qué correos
 * están registrados en el sitio.
 */
export async function autenticar(email: string, clave: string): Promise<Usuario | null> {
  const filas = await consultar<Usuario & { clave_hash: string }>(
    'usuario_por_email',
    'SELECT id, email, nombre, clave_hash FROM usuario WHERE email = $1',
    [email.toLowerCase().trim()],
  );

  const usuario = filas[0];
  if (!usuario) {
    await derivarClave(clave); // trabajo equivalente, para no delatar el caso
    return null;
  }

  const valida = await verificarClave(clave, usuario.clave_hash);
  if (!valida) return null;

  return { id: usuario.id, email: usuario.email, nombre: usuario.nombre };
}

/** Duración de una sesión, en días. */
const DIAS_SESION = 7;

/**
 * Crea una sesión para un usuario y devuelve su token.
 *
 * El token se guarda en una cookie `httpOnly`, de modo que JavaScript del
 * navegador no pueda leerlo.
 */
export async function crearSesion(usuarioId: number): Promise<string> {
  const token = randomUUID();
  await consultar(
    'sesion_crear',
    `INSERT INTO sesion (token, usuario_id, expira_en)
     VALUES ($1, $2, NOW() + ($3 || ' days')::interval)`,
    [token, usuarioId, String(DIAS_SESION)],
  );
  return token;
}

/**
 * Resuelve el usuario de una sesión vigente.
 *
 * Esta consulta se ejecuta en cada petición de un usuario autenticado, así que
 * su costo entra en el camino crítico. Se resuelve por la clave primaria de
 * `sesion` y una unión por clave primaria de `usuario`: ambas por índice.
 */
export async function usuarioDeSesion(token: string): Promise<Usuario | null> {
  const filas = await consultar<Usuario>(
    'sesion_resolver',
    `SELECT u.id, u.email, u.nombre
       FROM sesion s
       JOIN usuario u ON u.id = s.usuario_id
      WHERE s.token = $1 AND s.expira_en > NOW()`,
    [token],
  );
  return filas[0] ?? null;
}

/** Cierra una sesión. */
export async function cerrarSesion(token: string): Promise<void> {
  await consultar('sesion_cerrar', 'DELETE FROM sesion WHERE token = $1', [token]);
}

/** Asocia un carrito existente a un usuario que acaba de iniciar sesión. */
export async function vincularCarrito(
  tokenCarrito: string,
  usuarioId: number,
): Promise<void> {
  await consultar(
    'carrito_vincular_usuario',
    'UPDATE carrito SET usuario_id = $1 WHERE token = $2',
    [usuarioId, tokenCarrito],
  );
}

/** Busca un usuario por su id. */
export async function obtenerUsuario(id: number): Promise<Usuario | null> {
  const filas = await consultar<Usuario>(
    'usuario_por_id',
    'SELECT id, email, nombre FROM usuario WHERE id = $1',
    [id],
  );
  return filas[0] ?? null;
}
