-- ============================================================
-- BarberShop — Sprint 9 : E-Commerce Avancé
-- Wishlist · Reviews · Coupons · Alerte stock
-- ============================================================

-- ─── 1. Colonnes avgRating / reviewCount sur packs ──────────
ALTER TABLE packs
  ADD COLUMN IF NOT EXISTS avg_rating    DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count  INTEGER      DEFAULT 0;

-- ─── 2. TABLE : wishlists ────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  pack_id    UUID        NOT NULL REFERENCES packs(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_pack_id ON wishlists(pack_id);

-- ─── 3. ENUM + TABLE : reviews ───────────────────────────────
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reviews (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID          NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  pack_id    UUID          NOT NULL REFERENCES packs(id)  ON DELETE CASCADE,
  rating     SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  status     review_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, pack_id)   -- 1 avis par user par pack
);

CREATE INDEX IF NOT EXISTS idx_reviews_pack_id ON reviews(pack_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews(status);

-- Trigger updated_at
CREATE OR REPLACE TRIGGER trigger_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Fonction + trigger recalcul avgRating ────────────────
CREATE OR REPLACE FUNCTION recalc_pack_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE packs
  SET
    avg_rating   = (
      SELECT COALESCE(AVG(rating), 0)
      FROM reviews
      WHERE pack_id = COALESCE(NEW.pack_id, OLD.pack_id)
        AND status = 'approved'
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE pack_id = COALESCE(NEW.pack_id, OLD.pack_id)
        AND status = 'approved'
    )
  WHERE id = COALESCE(NEW.pack_id, OLD.pack_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_rating ON reviews;
CREATE TRIGGER trigger_recalc_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION recalc_pack_rating();

-- ─── 5. ENUM + TABLE : coupons ───────────────────────────────
DO $$ BEGIN
  CREATE TYPE discount_type AS ENUM ('percent','fixed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS coupons (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(50)   UNIQUE NOT NULL,
  discount_type discount_type NOT NULL DEFAULT 'percent',
  value         DECIMAL(10,2) NOT NULL,
  min_order     DECIMAL(10,2) DEFAULT 0,
  max_uses      INTEGER,
  used_count    INTEGER       NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

CREATE OR REPLACE TRIGGER trigger_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 6. Colonne coupon sur orders ────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS coupon_code      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_amount  DECIMAL(10,2) DEFAULT 0;

-- ─── 7. Confirmation ─────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Sprint 7 DB migrée !';
  RAISE NOTICE '   Tables    : wishlists, reviews, coupons';
  RAISE NOTICE '   Colonnes  : packs.avg_rating, packs.review_count';
  RAISE NOTICE '   Colonnes  : orders.coupon_code, orders.discount_amount';
END $$;