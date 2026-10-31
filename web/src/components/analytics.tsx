/**
 * Integración de Google Analytics 4 mediante gtag.js.
 *
 * El enunciado exige eventos personalizados de comercio electrónico
 * (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`) y métricas de
 * engagement. Las de engagement —tiempo en página, tasa de rebote, páginas por
 * sesión— las calcula GA4 por su cuenta a partir de la medición mejorada; los
 * eventos de comercio hay que emitirlos explícitamente.
 *
 * Si `NEXT_PUBLIC_GA_ID` no está definida, no se carga nada. Así el sitio
 * funciona en local sin ensuciar la propiedad de GA4 con tráfico de desarrollo
 * ni, sobre todo, con el tráfico sintético de las pruebas de carga.
 */

import Script from 'next/script';

export function Analytics() {
  const idMedicion = process.env.NEXT_PUBLIC_GA_ID;
  if (!idMedicion) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${idMedicion}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${idMedicion}', { currency: 'CLP' });
        `}
      </Script>
    </>
  );
}
