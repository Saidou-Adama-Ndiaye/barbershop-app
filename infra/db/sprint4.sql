-- Fichier sql crée lors du sprint 4
-- ============================================================
-- BarberShop — Sprint 4 : Réservations & Paiements
-- ============================================================

-- ─── ENUM : Statut réservation ───────────────────────────
DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'pending',
    'deposit_paid',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── TABLE : services ────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  price        DECIMAL(12,2) NOT NULL,
  duration_min INTEGER NOT NULL,
  deposit_pct  DECIMAL(5,2) DEFAULT 30,
  inclusions   TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);

-- ─── TABLE : staff_availability ──────────────────────────
CREATE TABLE IF NOT EXISTS staff_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_availability_staff_id    ON staff_availability(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_day_of_week ON staff_availability(day_of_week);

-- ─── TABLE : bookings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number VARCHAR(50) UNIQUE NOT NULL,
  client_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  staff_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_id     UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  booked_at      TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  status         booking_status NOT NULL DEFAULT 'pending',
  total_price    DECIMAL(12,2) NOT NULL,
  deposit_paid   DECIMAL(12,2) DEFAULT 0,
  notes          TEXT,
  reminder_sent  BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id      ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_staff_id       ON bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_at      ON bookings(booked_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_number ON bookings(booking_number);

-- ─── TABLE : payments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type             VARCHAR(50) NOT NULL,
  entity_id               UUID NOT NULL,
  amount                  DECIMAL(12,2) NOT NULL,
  currency                VARCHAR(3) DEFAULT 'XOF',
  provider                VARCHAR(50) DEFAULT 'wave',
  status                  VARCHAR(50) DEFAULT 'pending',
  provider_transaction_id VARCHAR(255),
  metadata                JSONB DEFAULT '{}',
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_entity_id   ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_provider    ON payments(provider);

-- ─── Triggers updated_at ─────────────────────────────────
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Seeder : 5 services ─────────────────────────────────
INSERT INTO services (name, description, price, duration_min, deposit_pct, inclusions)
VALUES
  ('Simple',  'Coupe simple sans extras',                     5000,  30, 30,
   ARRAY['Coupe', 'Lavage']),
  ('VIP',     'Coupe + barbe + soin visage',                 10000,  45, 30,
   ARRAY['Coupe', 'Barbe', 'Soin visage', 'Lavage']),
  ('Star',    'Service premium avec modelage',               15000,  60, 30,
   ARRAY['Coupe', 'Barbe', 'Modelage', 'Soin visage', 'Lavage', 'Coiffage']),
  ('Ultra',   'Expérience complète haut de gamme',           20000,  90, 30,
   ARRAY['Coupe', 'Barbe', 'Modelage', 'Masque', 'Massage cuir chevelu', 'Coiffage']),
  ('Premium', 'Le summum du soin capillaire professionnel',  30000, 120, 30,
   ARRAY['Coupe', 'Barbe', 'Modelage', 'Masque premium', 'Massage', 'Coiffage', 'Produits offerts'])
ON CONFLICT DO NOTHING;

-- ─── Seeder : disponibilités coiffeur (admin seed) ───────
-- On insère les disponibilités pour l'admin seed (Lun-Sam, 9h-18h)
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time)
SELECT
  u.id,
  d.day,
  '09:00'::TIME,
  '18:00'::TIME
FROM users u
CROSS JOIN (
  SELECT generate_series(1, 6) AS day -- Lundi=1 à Samedi=6
) d
WHERE u.email = 'admin@barbershop.local'
ON CONFLICT DO NOTHING;

-- ─── Confirmation ─────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ Sprint 4 DB initialisée !';
  RAISE NOTICE '   Tables : services, staff_availability, bookings, payments';
  RAISE NOTICE '   Seeder : 5 services insérés';
END $$;