-- =============================================================================
-- Pisada — Esquema de base de datos
-- INFB8091 Desempeño de Sistemas · UTEM 2026-2
-- =============================================================================
--
-- Notas de diseño relevantes para la evaluación de desempeño:
--
-- 1. El inventario vive en `variante.stock`, es decir, a nivel de SKU
--    (producto + talla + color). El descuento de stock durante el checkout
--    obliga a serializar el acceso a esa fila. Ese es el punto de contención
--    que el trabajo analiza con teoría de colas.
--
-- 2. Los índices se crean de forma deliberada y acotada. No se indexa todo:
--    parte del análisis consiste en observar el costo de las consultas del
--    catálogo y decidir qué índice agregar en función de la evidencia.
--
-- 3. `variante.version` habilita la estrategia de bloqueo optimista, para
--    poder compararla contra el bloqueo pesimista (SELECT ... FOR UPDATE).
-- =============================================================================

DROP TABLE IF EXISTS sesion         CASCADE;
DROP TABLE IF EXISTS pedido_item    CASCADE;
DROP TABLE IF EXISTS pedido         CASCADE;
DROP TABLE IF EXISTS carrito_item   CASCADE;
DROP TABLE IF EXISTS carrito        CASCADE;
DROP TABLE IF EXISTS variante       CASCADE;
DROP TABLE IF EXISTS producto       CASCADE;
DROP TABLE IF EXISTS color          CASCADE;
DROP TABLE IF EXISTS talla          CASCADE;
DROP TABLE IF EXISTS marca          CASCADE;
DROP TABLE IF EXISTS categoria      CASCADE;
DROP TABLE IF EXISTS usuario        CASCADE;

-- -----------------------------------------------------------------------------
-- Catálogo: dimensiones
-- -----------------------------------------------------------------------------

CREATE TABLE marca (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug   TEXT NOT NULL UNIQUE
);

CREATE TABLE categoria (
  id     SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  slug   TEXT NOT NULL UNIQUE
);

-- Las tallas se guardan como catálogo propio para poder ordenarlas de forma
-- correcta: "38" y "XL" no se ordenan alfabéticamente de manera útil.
CREATE TABLE talla (
  id        SERIAL PRIMARY KEY,
  etiqueta  TEXT NOT NULL,
  -- 'calzado' o 'vestuario': una talla 42 de zapatilla y una talla M de polera
  -- no pertenecen al mismo dominio.
  tipo      TEXT NOT NULL CHECK (tipo IN ('calzado', 'vestuario')),
  orden     INTEGER NOT NULL,
  UNIQUE (etiqueta, tipo)
);

CREATE TABLE color (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL UNIQUE,
  codigo_hex  TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- Catálogo: productos y variantes
-- -----------------------------------------------------------------------------

CREATE TABLE producto (
  id           SERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  nombre       TEXT NOT NULL,
  marca_id     INTEGER NOT NULL REFERENCES marca(id),
  categoria_id INTEGER NOT NULL REFERENCES categoria(id),
  genero       TEXT NOT NULL CHECK (genero IN ('hombre', 'mujer', 'unisex')),
  -- Precio en pesos chilenos, sin decimales.
  precio_clp   INTEGER NOT NULL CHECK (precio_clp > 0),
  descripcion  TEXT NOT NULL,
  -- Ficha extendida: materiales, uso recomendado, drop, peso, etc.
  -- Se guarda como JSONB para que la página de detalle sea deliberadamente
  -- más pesada que el listado.
  ficha        JSONB NOT NULL DEFAULT '{}'::jsonb,
  destacado    BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cada fila es un SKU vendible. Es la tabla caliente del sistema.
CREATE TABLE variante (
  id          SERIAL PRIMARY KEY,
  producto_id INTEGER NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
  talla_id    INTEGER NOT NULL REFERENCES talla(id),
  color_id    INTEGER NOT NULL REFERENCES color(id),
  sku         TEXT NOT NULL UNIQUE,
  stock       INTEGER NOT NULL CHECK (stock >= 0),
  -- Contador para control de concurrencia optimista.
  version     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (producto_id, talla_id, color_id)
);

-- -----------------------------------------------------------------------------
-- Usuarios
-- -----------------------------------------------------------------------------

CREATE TABLE usuario (
  id         SERIAL PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  -- Hash de la contraseña. Nunca se almacena la contraseña en texto plano.
  clave_hash TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sesiones iniciadas. El token vive en una cookie httpOnly.
--
-- Nota de desempeño: esta tabla se consulta en CADA petición de un usuario
-- autenticado, así que es un camino de acceso caliente. Su índice primario
-- sobre el token es lo que impide que esa consulta se vuelva un cuello de
-- botella propio.
CREATE TABLE sesion (
  token      TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  creado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expira_en  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sesion_usuario ON sesion (usuario_id);

-- -----------------------------------------------------------------------------
-- Carrito
-- -----------------------------------------------------------------------------

-- El carrito se identifica por un token de sesión, de modo que funcione tanto
-- para visitantes anónimos como para usuarios autenticados.
CREATE TABLE carrito (
  id              SERIAL PRIMARY KEY,
  token           TEXT NOT NULL UNIQUE,
  usuario_id      INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carrito_item (
  id          SERIAL PRIMARY KEY,
  carrito_id  INTEGER NOT NULL REFERENCES carrito(id) ON DELETE CASCADE,
  variante_id INTEGER NOT NULL REFERENCES variante(id),
  cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
  UNIQUE (carrito_id, variante_id)
);

-- -----------------------------------------------------------------------------
-- Pedidos
-- -----------------------------------------------------------------------------

CREATE TABLE pedido (
  id          SERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuario(id) ON DELETE SET NULL,
  estado      TEXT NOT NULL CHECK (estado IN ('pendiente', 'pagado', 'rechazado', 'cancelado')),
  total_clp   INTEGER NOT NULL CHECK (total_clp >= 0),
  -- Identificador devuelto por el sandbox del medio de pago.
  referencia_pago TEXT,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pedido_item (
  id                  SERIAL PRIMARY KEY,
  pedido_id           INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
  variante_id         INTEGER NOT NULL REFERENCES variante(id),
  cantidad            INTEGER NOT NULL CHECK (cantidad > 0),
  -- Se congela el precio al momento de la compra: el precio del producto
  -- puede cambiar después sin alterar el histórico del pedido.
  precio_unitario_clp INTEGER NOT NULL CHECK (precio_unitario_clp > 0)
);

-- -----------------------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------------------
-- Conjunto mínimo inicial. Los índices adicionales se agregan durante la
-- Fase 2, justificados por las mediciones y no por anticipación.

-- Camino de acceso principal del listado: filtrar por categoría y marca.
CREATE INDEX idx_producto_categoria ON producto (categoria_id);
CREATE INDEX idx_producto_marca     ON producto (marca_id);

-- Las variantes se resuelven siempre a partir de su producto.
CREATE INDEX idx_variante_producto  ON variante (producto_id);

-- Items de carrito y pedido por su contenedor.
CREATE INDEX idx_carrito_item_carrito ON carrito_item (carrito_id);
CREATE INDEX idx_pedido_item_pedido   ON pedido_item (pedido_id);

-- Nota deliberada: NO se crea índice de texto sobre producto.nombre.
-- La búsqueda por nombre se implementa primero con ILIKE, se mide su costo
-- bajo carga y recién entonces se evalúa agregar un índice GIN con pg_trgm.
-- El contraste antes/después es material del informe.
