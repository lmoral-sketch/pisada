/**
 * Plantilla raíz del sitio.
 *
 * Aquí se monta el encabezado común y, más adelante, la etiqueta de Google
 * Analytics 4. El pie deja constancia explícita del carácter académico del
 * sitio: es un requisito de honestidad, porque el checkout simula compras.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Analytics } from '@/components/analytics';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pisada — Zapatillas e indumentaria urbana',
  description:
    'Tienda de zapatillas e indumentaria urbana. Proyecto académico del ramo INFB8091 Desempeño de Sistemas, UTEM.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Pisada
            </Link>
            <Link href="/catalogo" className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
              Catálogo
            </Link>
            <Link
              href="/catalogo?categoria=zapatillas-running"
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Running
            </Link>
            <Link
              href="/catalogo?categoria=zapatillas-trail"
              className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Trail
            </Link>
            <Link
              href="/cuenta"
              className="ml-auto text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Mi cuenta
            </Link>
            <Link
              href="/carrito"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
            >
              Carrito
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-16 border-t border-neutral-200 py-6 dark:border-neutral-800">
          <p className="mx-auto max-w-6xl px-4 text-xs text-neutral-500">
            Sitio de ejercicio académico — INFB8091 Desempeño de Sistemas, Universidad
            Tecnológica Metropolitana. Las marcas y productos son ficticios y las compras
            son simuladas: no se procesan pagos reales.
          </p>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
