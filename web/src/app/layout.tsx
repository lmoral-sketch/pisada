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
import { Logotipo } from '@/components/marca';
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
        {/* Barra promocional. Marcado estático: no consulta nada ni pide red. */}
        <div className="bg-neutral-950 px-4 py-2 text-center text-xs font-medium text-white">
          Envío gratis sobre $60.000 · Hasta 6 cuotas sin interés con Webpay
        </div>

        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4">
            <Link href="/" aria-label="Pisada, inicio">
              <Logotipo />
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
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
            >
              Carrito
            </Link>
          </nav>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mt-20 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logotipo tamano={24} />
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-neutral-500">
                Calzado e indumentaria urbana. Más de 240 modelos con 4552 combinaciones de
                talla y color.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Catálogo</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/catalogo?categoria=zapatillas-running" className="text-neutral-600 hover:underline dark:text-neutral-400">Running</Link></li>
                <li><Link href="/catalogo?categoria=zapatillas-trail" className="text-neutral-600 hover:underline dark:text-neutral-400">Trail</Link></li>
                <li><Link href="/catalogo?categoria=zapatillas-urbanas" className="text-neutral-600 hover:underline dark:text-neutral-400">Urbanas</Link></li>
                <li><Link href="/catalogo" className="text-neutral-600 hover:underline dark:text-neutral-400">Ver todo</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Vestuario</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/catalogo?categoria=polerones" className="text-neutral-600 hover:underline dark:text-neutral-400">Polerones</Link></li>
                <li><Link href="/catalogo?categoria=chaquetas" className="text-neutral-600 hover:underline dark:text-neutral-400">Chaquetas</Link></li>
                <li><Link href="/catalogo?categoria=pantalones" className="text-neutral-600 hover:underline dark:text-neutral-400">Pantalones</Link></li>
                <li><Link href="/catalogo?categoria=poleras" className="text-neutral-600 hover:underline dark:text-neutral-400">Poleras</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Cuenta</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/cuenta" className="text-neutral-600 hover:underline dark:text-neutral-400">Iniciar sesión</Link></li>
                <li><Link href="/carrito" className="text-neutral-600 hover:underline dark:text-neutral-400">Mi carrito</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-200 py-6 dark:border-neutral-800">
          <p className="mx-auto max-w-6xl px-4 text-xs text-neutral-500">
            Sitio de ejercicio académico — INFB8091 Desempeño de Sistemas, Universidad
            Tecnológica Metropolitana. Las marcas y productos son ficticios y las compras
            son simuladas: no se procesan pagos reales.
          </p>
          </div>
        </footer>

        <Analytics />
      </body>
    </html>
  );
}
