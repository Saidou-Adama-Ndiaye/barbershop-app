-- ============================================================
-- SPRINT 7 — Profil Utilisateur & Sécurité Email
-- À exécuter sur la base de données barbershop
-- ============================================================

-- ─── 1. Ajout colonnes à la table users ─────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMPTZ;

-- ─── 2. Création table user_addresses ───────────────────────
CREATE TABLE IF NOT EXISTS user_addresses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(100) NOT NULL,
  street      VARCHAR(255) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  country     VARCHAR(100) NOT NULL DEFAULT 'Sénégal',
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Index sur user_addresses ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
  ON user_addresses(user_id);

-- ─── 4. Trigger updated_at automatique sur user_addresses ───
-- (uniquement si tu as déjà une fonction trigger update_updated_at)
-- Sinon on la crée :
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 5. Vérification finale ──────────────────────────────────
-- Exécute ces SELECT pour confirmer que tout est en place :

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'verification_token',
    'verified_at',
    'reset_password_token',
    'reset_password_expires_at'
  );
-- Résultat attendu : 4 lignes

SELECT table_name
FROM information_schema.tables
WHERE table_name = 'user_addresses';
-- Résultat attendu : 1 ligne