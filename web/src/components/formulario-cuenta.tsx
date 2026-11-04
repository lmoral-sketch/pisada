'use client';

/**
 * Formulario de ingreso y registro.
 *
 * Alterna entre ambos modos sin cambiar de ruta.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Usuario } from '@/lib/auth';

type Modo = 'ingreso' | 'registro';

export function FormularioCuenta({ usuarioInicial }: { usuarioInicial: Usuario | null }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState(usuarioInicial);
  const [modo, setModo] = useState<Modo>('ingreso');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setError(null);

    const datos = new FormData(evento.currentTarget);

    try {
      const respuesta = await fetch(`/api/auth?accion=${modo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: datos.get('email'),
          clave: datos.get('clave'),
          nombre: datos.get('nombre') ?? '',
        }),
      });

      const cuerpo = await respuesta.json();

      if (!respuesta.ok) {
        setError(cuerpo.error ?? 'No se pudo completar la operación.');
        return;
      }

      setUsuario(cuerpo.usuario);
      router.refresh();
    } catch {
      setError('Error de conexión.');
    } finally {
      setEnviando(false);
    }
  }

  async function alSalir() {
    await fetch('/api/auth', { method: 'DELETE' });
    setUsuario(null);
    router.refresh();
  }

  if (usuario) {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800">
        <div>
          <h1 className="text-lg font-semibold">Hola, {usuario.nombre}</h1>
          <p className="text-sm text-neutral-500">{usuario.email}</p>
        </div>
        <button
          type="button"
          onClick={alSalir}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={alEnviar}
      className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-6 dark:border-neutral-800"
    >
      <h1 className="text-lg font-semibold">
        {modo === 'ingreso' ? 'Iniciar sesión' : 'Crear cuenta'}
      </h1>

      {modo === 'registro' && (
        <Campo etiqueta="Nombre" nombre="nombre" tipo="text" autoComplete="name" />
      )}
      <Campo etiqueta="Correo" nombre="email" tipo="email" autoComplete="email" />
      <Campo
        etiqueta="Contraseña"
        nombre="clave"
        tipo="password"
        autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
        ayuda={modo === 'registro' ? 'Mínimo 8 caracteres.' : undefined}
      />

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:bg-neutral-400 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {enviando ? 'Procesando...' : modo === 'ingreso' ? 'Entrar' : 'Registrarme'}
      </button>

      <button
        type="button"
        onClick={() => {
          setModo(modo === 'ingreso' ? 'registro' : 'ingreso');
          setError(null);
        }}
        className="text-sm text-neutral-600 underline dark:text-neutral-400"
      >
        {modo === 'ingreso'
          ? '¿No tienes cuenta? Crear una'
          : '¿Ya tienes cuenta? Iniciar sesión'}
      </button>
    </form>
  );
}

/** Campo de formulario con su etiqueta y ayuda opcional. */
function Campo({
  etiqueta,
  nombre,
  tipo,
  autoComplete,
  ayuda,
}: {
  etiqueta: string;
  nombre: string;
  tipo: string;
  autoComplete: string;
  ayuda?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {etiqueta}
      </span>
      <input
        name={nombre}
        type={tipo}
        required
        autoComplete={autoComplete}
        className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {ayuda && <span className="text-xs text-neutral-500">{ayuda}</span>}
    </label>
  );
}
