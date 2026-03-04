-- ============================================================
-- SPRINT 8 — Interface Coiffeur Professionnel
-- À exécuter sur la base de données barbershop
-- ============================================================

-- ─── 1. Ajout colonne staff_notes dans bookings ──────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_notes TEXT;

-- ─── 2. Vérification finale ──────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name = 'staff_notes';
-- Résultat attendu : 1 ligne

-- ─── 3. Vérification table staff_availability ────────────────
-- (déjà créée lors du Sprint 1 — juste vérification)
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'staff_availability';
-- Résultat attendu : 1 ligne