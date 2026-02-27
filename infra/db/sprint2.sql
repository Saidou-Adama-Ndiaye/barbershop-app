-- ============================================================
-- BarberShop — Sprint 2 : E-commerce (Packs, Produits, Commandes)
-- ============================================================

-- Extension pour les slugs (déjà présente via Sprint 1)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM : Statut commande ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── TABLE : categories ──────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  image_url   TEXT,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ─── TABLE : products ────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  unit_price  DECIMAL(12,2) NOT NULL,
  stock_qty   INTEGER DEFAULT 0,
  sku         VARCHAR(100) UNIQUE,
  image_urls  TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_sku         ON products(sku);

-- ─── TABLE : packs ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS packs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) UNIQUE NOT NULL,
  description     TEXT,
  base_price      DECIMAL(12,2) NOT NULL,
  discount_pct    DECIMAL(5,2) DEFAULT 0,
  image_urls      TEXT[] DEFAULT '{}',
  is_customizable BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packs_slug        ON packs(slug);
CREATE INDEX IF NOT EXISTS idx_packs_is_active   ON packs(is_active);
CREATE INDEX IF NOT EXISTS idx_packs_category_id ON packs(category_id);

-- ─── TABLE : pack_products ───────────────────────────────
CREATE TABLE IF NOT EXISTS pack_products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id     UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  is_optional BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  UNIQUE(pack_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_pack_products_pack_id    ON pack_products(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_products_product_id ON pack_products(product_id);

-- ─── TABLE : orders ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  order_number     VARCHAR(20) UNIQUE NOT NULL,
  status           order_status NOT NULL DEFAULT 'pending',
  total_amount     DECIMAL(12,2) NOT NULL,
  currency         VARCHAR(3) DEFAULT 'XOF',
  delivery_address JSONB,
  notes            TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id      ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- ─── TABLE : order_items ─────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pack_id        UUID REFERENCES packs(id) ON DELETE SET NULL,
  pack_snapshot  JSONB NOT NULL,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price     DECIMAL(12,2) NOT NULL,
  customizations JSONB DEFAULT '{}',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_pack_id  ON order_items(pack_id);

-- ─── Triggers updated_at ─────────────────────────────────
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packs_updated_at ON packs;
CREATE TRIGGER update_packs_updated_at
  BEFORE UPDATE ON packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Confirmation ─────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Sprint 2 DB initialisée !';
  RAISE NOTICE '   Tables : categories, products, packs, pack_products, orders, order_items';
END $$;