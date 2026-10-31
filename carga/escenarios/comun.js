/**
 * Pisada — Modelo de carga compartido por todos los escenarios.
 *
 * Implementa un Customer Behavior Model Graph (CBMG) como el que describe el
 * material de cátedra "Modelos de Carga en la Web": los usuarios sintéticos no
 * recorren una secuencia fija, sino que transitan entre estados con
 * probabilidades definidas.
 *
 * Esto importa para la validez del estudio. Un generador que siempre haga
 * "home → catálogo → producto → comprar" produce una carga uniforme e irreal:
 * todos los usuarios llegan al checkout, y la distribución de carga entre
 * páginas no se parece a la de un sitio real. Con el CBMG, la mayoría navega y
 * se va, una fracción agrega al carrito y una fracción menor compra — igual que
 * en el comercio real, donde la conversión ronda el 1 % a 3 %.
 *
 * Las probabilidades de este archivo son el MODELO BASE (Etapa I de la Cátedra
 * 1.1). Una vez que GA4 acumule datos reales del sitio, deben ajustarse con esas
 * mediciones y volver a correr los escenarios: ese es el ciclo de validación de
 * la Etapa II.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// -----------------------------------------------------------------------------
// Configuración
// -----------------------------------------------------------------------------

export const BASE = __ENV.BASE_URL || 'http://localhost:3000';

/** Estrategia de concurrencia a ejercitar: 'pesimista' u 'optimista'. */
export const ESTRATEGIA = __ENV.ESTRATEGIA || '';

// -----------------------------------------------------------------------------
// Métricas propias
// -----------------------------------------------------------------------------
// k6 ya entrega duración, throughput y tasa de error. Estas métricas agregan lo
// que es específico de este sistema y que el informe necesita.

/** Compras completadas con éxito. */
export const compras = new Counter('pisada_compras');

/** Compras rechazadas por falta de stock (HTTP 409). */
export const sinStock = new Counter('pisada_sin_stock');

/** Compras rechazadas por contención extrema (HTTP 503). */
export const conflictos = new Counter('pisada_conflictos');

/** Proporción de checkouts que terminaron en compra. Es la conversión final. */
export const tasaConversion = new Rate('pisada_tasa_conversion');

/**
 * Duración del checkout, aislada del resto de la navegación.
 *
 * Es la métrica central: el checkout es donde vive la contención, y mezclarlo
 * con los tiempos del catálogo escondería su degradación detrás de peticiones
 * baratas.
 */
export const duracionCheckout = new Trend('pisada_checkout_duracion', true);

/** Reintentos consumidos por la estrategia optimista. */
export const reintentos = new Counter('pisada_reintentos');

// -----------------------------------------------------------------------------
// Umbrales comunes
// -----------------------------------------------------------------------------

/**
 * Umbrales de aceptación.
 *
 * Nota sobre la tasa de error: se excluyen de forma explícita los 409 y 503 del
 * checkout. Un 409 significa "se agotó el stock", que es un desenlace de
 * negocio legítimo y no una falla del sistema. Contarlo como error llevaría a
 * concluir que el sitio se cae cuando en realidad está vendiendo todo.
 */
export const UMBRALES = {
  // Percentiles que exige el enunciado.
  http_req_duration: ['p(90)<800', 'p(95)<1500', 'p(99)<3000'],
  // Solo fallas reales: 5xx distintos de 503, y errores de conexión.
  'http_req_failed{esperado:si}': ['rate<0.01'],
  checks: ['rate>0.95'],
};

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

/** Devuelve un entero aleatorio entre min y max, ambos incluidos. */
export function entre(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Elige un elemento al azar de una lista. */
export function elegir(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Tiempo de reflexión del usuario entre acciones (think time).
 *
 * No es un adorno: sin think time, cada usuario virtual genera cientos de
 * peticiones por segundo y 50 usuarios virtuales equivaldrían a miles de
 * usuarios reales. El resultado sería un número de "usuarios soportados"
 * ridículamente bajo y sin sentido. Con think time realista, un usuario virtual
 * se aproxima a una persona.
 */
export function pensar(min = 1, max = 5) {
  sleep(min + Math.random() * (max - min));
}

/** Extrae los slugs de producto que aparecen en el HTML de una página. */
export function extraerSlugs(html) {
  const encontrados = [];
  const patron = /href="\/producto\/([a-z0-9-]+)"/g;
  let coincidencia;
  while ((coincidencia = patron.exec(html)) !== null) {
    if (!encontrados.includes(coincidencia[1])) encontrados.push(coincidencia[1]);
  }
  return encontrados;
}

/**
 * Extrae ids de variante del HTML de la ficha de producto.
 *
 * El selector de tallas renderiza un botón por variante. Las deshabilitadas
 * corresponden a combinaciones sin stock, y se descartan: un usuario real no
 * puede elegirlas.
 */
export function extraerVariantes(html) {
  const ids = [];
  // Los botones de talla llevan su key de React, pero lo estable es el atributo
  // de control del componente. Se buscan los que NO estén deshabilitados.
  const patron = /<button[^>]*?>/g;
  let coincidencia;
  while ((coincidencia = patron.exec(html)) !== null) {
    const etiqueta = coincidencia[0];
    if (etiqueta.includes('disabled')) continue;
    const id = etiqueta.match(/data-variante="(\d+)"/);
    if (id) ids.push(Number(id[1]));
  }
  return ids;
}

// -----------------------------------------------------------------------------
// Pasos del embudo
// -----------------------------------------------------------------------------

export function verHome() {
  const res = http.get(`${BASE}/`, {
    tags: { pagina: 'home', esperado: 'si' },
  });
  check(res, { 'home responde 200': (r) => r.status === 200 });
  return res;
}

/** Visita el catálogo, opcionalmente con filtros, imitando la navegación real. */
export function verCatalogo() {
  // Un tercio de las visitas al catálogo aplica algún filtro. Los filtros son
  // más caros de resolver que el listado sin filtrar, así que su proporción
  // afecta directamente la carga sobre la base de datos.
  const filtros = [
    '',
    '?categoria=zapatillas-running',
    '?categoria=zapatillas-urbanas',
    '?genero=mujer',
    '?talla=42',
    '?color=Negro',
    `?pagina=${entre(2, 5)}`,
    '?q=trail',
  ];
  const consulta = Math.random() < 0.35 ? elegir(filtros.slice(1)) : '';

  const res = http.get(`${BASE}/catalogo${consulta}`, {
    tags: { pagina: 'catalogo', esperado: 'si' },
  });
  check(res, { 'catalogo responde 200': (r) => r.status === 200 });
  return res;
}

export function verProducto(slug) {
  const res = http.get(`${BASE}/producto/${slug}`, {
    tags: { pagina: 'producto', esperado: 'si' },
  });
  check(res, { 'producto responde 200': (r) => r.status === 200 });
  return res;
}

/** Agrega una variante al carrito. */
export function agregarAlCarrito(varianteId) {
  const res = http.post(
    `${BASE}/api/carrito`,
    JSON.stringify({ variante_id: varianteId, cantidad: 1 }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { pagina: 'api_carrito', esperado: 'si' },
    },
  );
  check(res, { 'agregar al carrito responde 200': (r) => r.status === 200 });
  return res;
}

export function verCarrito() {
  const res = http.get(`${BASE}/carrito`, {
    tags: { pagina: 'carrito', esperado: 'si' },
  });
  check(res, { 'carrito responde 200': (r) => r.status === 200 });
  return res;
}

/**
 * Ejecuta el pago y clasifica el desenlace.
 *
 * El 409 y el 503 se marcan con `esperado: no` para que queden FUERA de la tasa
 * de error de los umbrales, pero siguen contándose en métricas propias: son
 * resultados de negocio, no fallas.
 */
export function pagar() {
  const consulta = ESTRATEGIA ? `?estrategia=${ESTRATEGIA}` : '';
  const res = http.post(`${BASE}/api/checkout${consulta}`, null, {
    tags: { pagina: 'api_checkout', esperado: 'no' },
  });

  duracionCheckout.add(res.timings.duration);

  if (res.status === 200) {
    compras.add(1);
    tasaConversion.add(true);
    try {
      const cuerpo = res.json();
      if (cuerpo && cuerpo.reintentos) reintentos.add(cuerpo.reintentos);
    } catch (_) {
      // Cuerpo no interpretable: no es motivo para fallar la iteración.
    }
  } else if (res.status === 409) {
    sinStock.add(1);
    tasaConversion.add(false);
  } else if (res.status === 503) {
    conflictos.add(1);
    tasaConversion.add(false);
  } else {
    tasaConversion.add(false);
  }

  check(res, {
    'checkout con desenlace conocido': (r) =>
      r.status === 200 || r.status === 409 || r.status === 503 || r.status === 400,
  });

  return res;
}

// -----------------------------------------------------------------------------
// Customer Behavior Model Graph
// -----------------------------------------------------------------------------

/**
 * Probabilidades de transición entre estados.
 *
 * Cada fila suma 1. Son el modelo base, a calibrar con los datos reales que
 * entregue GA4 (Etapa II de la modelación).
 *
 * Los valores iniciales reflejan un comercio electrónico típico:
 *  - la mayoría de las sesiones termina sin comprar;
 *  - del total de visitantes, cerca del 2 % concreta una compra, que es el
 *    orden de magnitud habitual del rubro.
 */
export const CBMG = {
  inicio: { home: 0.6, catalogo: 0.4 },
  home: { catalogo: 0.55, producto: 0.2, salir: 0.25 },
  catalogo: { producto: 0.5, catalogo: 0.25, salir: 0.25 },
  producto: { carrito: 0.12, catalogo: 0.33, producto: 0.2, salir: 0.35 },
  carrito: { checkout: 0.55, catalogo: 0.15, salir: 0.3 },
  checkout: { salir: 1.0 },
};

/** Elige el siguiente estado según las probabilidades del CBMG. */
export function siguienteEstado(estado) {
  const transiciones = CBMG[estado];
  if (!transiciones) return 'salir';

  let acumulado = 0;
  const dado = Math.random();
  for (const [destino, probabilidad] of Object.entries(transiciones)) {
    acumulado += probabilidad;
    if (dado <= acumulado) return destino;
  }
  return 'salir';
}

/**
 * Recorre una sesión completa siguiendo el CBMG.
 *
 * Es el comportamiento que comparten los escenarios de carga baja, normal y
 * pico. Lo único que cambia entre ellos es la cantidad de usuarios y el perfil
 * de llegada, no la forma de navegar.
 */
export function sesionDeUsuario() {
  let estado = siguienteEstado('inicio');
  let slugs = [];
  let variantes = [];
  // Cota de seguridad: impide que un ciclo del grafo produzca sesiones
  // infinitas si alguien ajusta mal las probabilidades.
  let pasos = 0;

  while (estado !== 'salir' && pasos < 15) {
    pasos++;

    switch (estado) {
      case 'home': {
        const res = verHome();
        slugs = extraerSlugs(res.body);
        pensar(1, 4);
        break;
      }

      case 'catalogo': {
        const res = verCatalogo();
        slugs = extraerSlugs(res.body);
        pensar(2, 6);
        break;
      }

      case 'producto': {
        if (slugs.length === 0) {
          estado = 'catalogo';
          continue;
        }
        const res = verProducto(elegir(slugs));
        variantes = extraerVariantes(res.body);
        // La ficha se mira con más calma que un listado.
        pensar(3, 10);
        break;
      }

      case 'carrito': {
        if (variantes.length === 0) {
          // Llegó a un producto agotado en todas sus tallas: no puede comprar.
          // Es una fuga legítima del embudo, no un error del generador.
          estado = 'catalogo';
          continue;
        }
        agregarAlCarrito(elegir(variantes));
        pensar(1, 3);
        verCarrito();
        pensar(2, 8);
        break;
      }

      case 'checkout': {
        pagar();
        pensar(1, 3);
        break;
      }
    }

    estado = siguienteEstado(estado);
  }
}
