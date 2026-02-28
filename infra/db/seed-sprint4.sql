-- ============================================================
-- BarberShop — Seed Sprint 4 : Données de test navigateur
-- ============================================================

-- ─── 1. Nettoyer les données existantes (ordre FK) ────────
DELETE FROM bookings          WHERE 1=1;
DELETE FROM payments          WHERE 1=1;
DELETE FROM staff_availability WHERE 1=1;
DELETE FROM services          WHERE 1=1;

-- ─── 2. Services (5 formules) ────────────────────────────
INSERT INTO services (id, name, description, price, duration_min, deposit_pct, inclusions, is_active)
VALUES
  (
    'aaaaaaaa-0001-0001-0001-000000000001',
    'Simple',
    'Coupe simple, nette et rapide pour un look soigné au quotidien.',
    5000, 30, 30,
    ARRAY['Coupe', 'Lavage'],
    TRUE
  ),
  (
    'aaaaaaaa-0002-0002-0002-000000000002',
    'VIP',
    'Coupe premium avec soin barbe et masque visage hydratant.',
    10000, 45, 30,
    ARRAY['Coupe', 'Barbe', 'Soin visage', 'Lavage'],
    TRUE
  ),
  (
    'aaaaaaaa-0003-0003-0003-000000000003',
    'Star',
    'Service complet avec modelage professionnel et coiffage.',
    15000, 60, 30,
    ARRAY['Coupe', 'Barbe', 'Modelage', 'Soin visage', 'Lavage', 'Coiffage'],
    TRUE
  ),
  (
    'aaaaaaaa-0004-0004-0004-000000000004',
    'Ultra',
    'Expérience haut de gamme avec masque capillaire et massage.',
    20000, 90, 30,
    ARRAY['Coupe', 'Barbe', 'Modelage', 'Masque', 'Massage cuir chevelu', 'Coiffage'],
    TRUE
  ),
  (
    'aaaaaaaa-0005-0005-0005-000000000005',
    'Premium',
    'Le summum du soin capillaire — expérience 5 étoiles complète.',
    30000, 120, 30,
    ARRAY['Coupe', 'Barbe', 'Modelage', 'Masque premium', 'Massage', 'Coiffage', 'Produits offerts'],
    TRUE
  );

-- ─── 3. Compte coiffeur de test ───────────────────────────
-- Mot de passe : Coiffeur@2025!  (même hash bcrypt que admin)
INSERT INTO users (
  id, email, password_hash, first_name, last_name,
  role, is_verified, is_active
)
VALUES (
  'bbbbbbbb-0001-0001-0001-000000000001',
  'coiffeur@barbershop.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TpivkMq8JDm/UpW.sUK94.e5bCfm',
  'Amadou',
  'Diallo',
  'coiffeur_professionnel',
  TRUE,
  TRUE
)
ON CONFLICT (email) DO UPDATE
  SET role       = 'coiffeur_professionnel',
      first_name = 'Amadou',
      last_name  = 'Diallo',
      is_active  = TRUE;

-- ─── 4. Récupérer les IDs réels pour staff_availability ───
-- On insère les disponibilités pour :
--   (a) le coiffeur de test
--   (b) l'admin seed (admin@barbershop.local)

-- Coiffeur Amadou : Lundi → Samedi, 8h → 19h
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time, is_active)
SELECT
  u.id,
  d.day,
  '08:00'::TIME,
  '19:00'::TIME,
  TRUE
FROM users u
CROSS JOIN (SELECT generate_series(1, 6) AS day) d
WHERE u.email = 'coiffeur@barbershop.local'
ON CONFLICT DO NOTHING;

-- Admin seed : Lundi → Vendredi, 9h → 17h
INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time, is_active)
SELECT
  u.id,
  d.day,
  '09:00'::TIME,
  '17:00'::TIME,
  TRUE
FROM users u
CROSS JOIN (SELECT generate_series(1, 5) AS day) d
WHERE u.email = 'admin@barbershop.local'
ON CONFLICT DO NOTHING;

-- ─── 5. Quelques réservations de démo ─────────────────────
-- RDV passé — complété (pour tester l'historique)
INSERT INTO bookings (
  booking_number, client_id, staff_id, service_id,
  booked_at, end_at, status, total_price, deposit_paid, notes
)
SELECT
  'RDV-2025-00001',
  client.id,
  staff.id,
  'aaaaaaaa-0002-0002-0002-000000000002',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days' + INTERVAL '45 minutes',
  'completed',
  10000,
  3000,
  'Premier RDV de démo'
FROM
  (SELECT id FROM users WHERE email = 'admin@barbershop.local') AS client,
  (SELECT id FROM users WHERE email = 'coiffeur@barbershop.local') AS staff
ON CONFLICT (booking_number) DO NOTHING;

-- RDV futur — acompte payé (pour tester statut deposit_paid)
INSERT INTO bookings (
  booking_number, client_id, staff_id, service_id,
  booked_at, end_at, status, total_price, deposit_paid, notes
)
SELECT
  'RDV-2025-00002',
  client.id,
  staff.id,
  'aaaaaaaa-0003-0003-0003-000000000003',
  NOW() + INTERVAL '3 days',
  NOW() + INTERVAL '3 days' + INTERVAL '60 minutes',
  'deposit_paid',
  15000,
  4500,
  'RDV Star dans 3 jours'
FROM
  (SELECT id FROM users WHERE email = 'admin@barbershop.local') AS client,
  (SELECT id FROM users WHERE email = 'coiffeur@barbershop.local') AS staff
ON CONFLICT (booking_number) DO NOTHING;

-- RDV futur — en attente paiement
INSERT INTO bookings (
  booking_number, client_id, staff_id, service_id,
  booked_at, end_at, status, total_price, deposit_paid
)
SELECT
  'RDV-2025-00003',
  client.id,
  staff.id,
  'aaaaaaaa-0001-0001-0001-000000000001',
  NOW() + INTERVAL '5 days',
  NOW() + INTERVAL '5 days' + INTERVAL '30 minutes',
  'pending',
  5000,
  0
FROM
  (SELECT id FROM users WHERE email = 'admin@barbershop.local') AS client,
  (SELECT id FROM users WHERE email = 'coiffeur@barbershop.local') AS staff
ON CONFLICT (booking_number) DO NOTHING;

-- ─── 6. Confirmation ──────────────────────────────────────
DO $$
DECLARE
  v_services        INTEGER;
  v_staff_avail     INTEGER;
  v_bookings        INTEGER;
  v_coiffeur_id     UUID;
BEGIN
  SELECT COUNT(*)   INTO v_services    FROM services;
  SELECT COUNT(*)   INTO v_staff_avail FROM staff_availability;
  SELECT COUNT(*)   INTO v_bookings    FROM bookings;
  SELECT id         INTO v_coiffeur_id FROM users WHERE email = 'coiffeur@barbershop.local';

  RAISE NOTICE '✅ Seed Sprint 4 terminé !';
  RAISE NOTICE '   Services        : % formules', v_services;
  RAISE NOTICE '   Disponibilités  : % créneaux coiffeurs', v_staff_avail;
  RAISE NOTICE '   Réservations    : % RDVs de démo', v_bookings;
  RAISE NOTICE '';
  RAISE NOTICE '📋 Comptes de test :';
  RAISE NOTICE '   Admin    : admin@barbershop.local     / Admin@2025!';
  RAISE NOTICE '   Coiffeur : coiffeur@barbershop.local  / Coiffeur@2025!';
  RAISE NOTICE '';
  RAISE NOTICE '🆔 Staff ID pour /bookings/availability :';
  RAISE NOTICE '   %', v_coiffeur_id;
END $$;