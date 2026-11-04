import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * Salida autónoma: Next.js genera una carpeta `.next/standalone` con el
   * servidor y solo las dependencias que realmente usa.
   *
   * Importa para este proyecto: reduce la imagen Docker de unos 1,2 GB a cerca
   * de 200 MB. En un plan gratuito con disco y memoria acotados, eso es la
   * diferencia entre poder desplegar y no poder.
   */
  output: 'standalone',

  /**
   * No se desactiva la telemetría de Next por configuración porque no existe tal
   * opción; se hace con la variable NEXT_TELEMETRY_DISABLED en el Dockerfile.
   * Se menciona aquí para que quede constancia de que es deliberado: no
   * queremos tráfico de red ajeno al sistema durante las mediciones.
   */
};

export default nextConfig;
