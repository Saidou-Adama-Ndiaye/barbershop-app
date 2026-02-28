-- ============================================================
-- BarberShop — Sprint 5 : E-learning
-- ============================================================

DO $$ BEGIN
  CREATE TYPE formation_level AS ENUM (
    'debutant', 'intermediaire', 'avance'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── TABLE : formations ──────────────────────────────────
CREATE TABLE IF NOT EXISTS formations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          VARCHAR(255) NOT NULL,
  slug           VARCHAR(255) UNIQUE NOT NULL,
  description    TEXT,
  instructor_id  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  price          DECIMAL(12,2) NOT NULL,
  thumbnail_url  TEXT,
  trailer_url    TEXT,
  duration_min   INTEGER DEFAULT 0,
  level          formation_level DEFAULT 'debutant',
  language       VARCHAR(10) DEFAULT 'fr',
  tags           TEXT[] DEFAULT '{}',
  is_published   BOOLEAN DEFAULT FALSE,
  total_enrolled INTEGER DEFAULT 0,
  avg_rating     DECIMAL(3,2),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formations_slug         ON formations(slug);
CREATE INDEX IF NOT EXISTS idx_formations_instructor   ON formations(instructor_id);
CREATE INDEX IF NOT EXISTS idx_formations_level        ON formations(level);
CREATE INDEX IF NOT EXISTS idx_formations_is_published ON formations(is_published);
CREATE INDEX IF NOT EXISTS idx_formations_price        ON formations(price);

-- ─── TABLE : videos ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id    UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  storage_key     TEXT NOT NULL,
  duration_sec    INTEGER DEFAULT 0,
  sort_order      INTEGER DEFAULT 0,
  is_free_preview BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_formation_id ON videos(formation_id);
CREATE INDEX IF NOT EXISTS idx_videos_sort_order   ON videos(sort_order);

-- ─── TABLE : enrollments ─────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  formation_id    UUID NOT NULL REFERENCES formations(id) ON DELETE RESTRICT,
  payment_id      UUID,
  enrolled_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at    TIMESTAMP WITH TIME ZONE,
  certificate_url TEXT,
  UNIQUE(user_id, formation_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id      ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_formation_id ON enrollments(formation_id);

-- ─── TABLE : video_progress ──────────────────────────────
CREATE TABLE IF NOT EXISTS video_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id     UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  watched_sec  INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_progress_user_id  ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);

-- ─── Triggers ────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_formations_updated_at ON formations;
CREATE TRIGGER update_formations_updated_at
  BEFORE UPDATE ON formations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Seeder ──────────────────────────────────────────────
DO $$
DECLARE
  v_instructor_id UUID;
  v_f1 UUID; v_f2 UUID; v_f3 UUID;
BEGIN
  SELECT id INTO v_instructor_id FROM users WHERE email = 'admin@barbershop.local';
  IF v_instructor_id IS NULL THEN
    RAISE NOTICE 'Admin non trouvé, seeder ignoré'; RETURN;
  END IF;

  INSERT INTO formations (title, slug, description, instructor_id, price, level, language, tags, is_published, duration_min)
  VALUES ('Maîtriser la Coupe Homme — Débutant', 'coupe-homme-debutant',
    'Apprenez les bases de la coupe homme : tenue des ciseaux, dégradé simple, finitions.',
    v_instructor_id, 15000, 'debutant', 'fr',
    ARRAY['coupe','debutant','ciseaux','dégradé'], TRUE, 120)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_f1;

  INSERT INTO formations (title, slug, description, instructor_id, price, level, language, tags, is_published, duration_min)
  VALUES ('Taille de Barbe Professionnelle', 'taille-barbe-pro',
    'Maîtrisez toutes les techniques de taille de barbe : contours nets, styling, soins.',
    v_instructor_id, 20000, 'intermediaire', 'fr',
    ARRAY['barbe','rasage','styling','intermediaire'], TRUE, 90)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_f2;

  INSERT INTO formations (title, slug, description, instructor_id, price, level, language, tags, is_published, duration_min)
  VALUES ('Techniques Avancées — Dégradé & Modelage', 'degrade-modelage-avance',
    'Formation avancée : dégradé américain, skin fade, modelage afro, tresses.',
    v_instructor_id, 35000, 'avance', 'fr',
    ARRAY['degrade','skin-fade','modelage','avance'], TRUE, 180)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO v_f3;

  IF v_f1 IS NOT NULL THEN
    INSERT INTO videos (formation_id, title, storage_key, duration_sec, sort_order, is_free_preview) VALUES
      (v_f1, 'Introduction & matériel',  'videos/formation1/01-intro.mp4',      300, 1, TRUE),
      (v_f1, 'Tenue des ciseaux',        'videos/formation1/02-ciseaux.mp4',    480, 2, FALSE),
      (v_f1, 'Le dégradé simple',        'videos/formation1/03-degrade.mp4',    720, 3, FALSE),
      (v_f1, 'Finitions & styling',      'videos/formation1/04-finitions.mp4',  360, 4, FALSE);
  END IF;

  IF v_f2 IS NOT NULL THEN
    INSERT INTO videos (formation_id, title, storage_key, duration_sec, sort_order, is_free_preview) VALUES
      (v_f2, 'Anatomie de la barbe',     'videos/formation2/01-anatomie.mp4',   420, 1, TRUE),
      (v_f2, 'Contours & Ligne',         'videos/formation2/02-contours.mp4',   600, 2, FALSE),
      (v_f2, 'Rasage classique',         'videos/formation2/03-rasage.mp4',     540, 3, FALSE),
      (v_f2, 'Beard styling moderne',    'videos/formation2/04-styling.mp4',    480, 4, FALSE),
      (v_f2, 'Soins & produits',         'videos/formation2/05-soins.mp4',      300, 5, FALSE);
  END IF;

  IF v_f3 IS NOT NULL THEN
    INSERT INTO videos (formation_id, title, storage_key, duration_sec, sort_order, is_free_preview) VALUES
      (v_f3, 'Dégradé américain',        'videos/formation3/01-americain.mp4',  900, 1, TRUE),
      (v_f3, 'Skin Fade technique',      'videos/formation3/02-skinfade.mp4',  1080, 2, FALSE),
      (v_f3, 'Modelage afro',            'videos/formation3/03-afro.mp4',       840, 3, FALSE),
      (v_f3, 'Tresses & locks',          'videos/formation3/04-tresses.mp4',    960, 4, FALSE),
      (v_f3, 'Cas pratiques',            'videos/formation3/05-pratique.mp4',   720, 5, FALSE);
  END IF;

  RAISE NOTICE '✅ Sprint 5 : 3 formations + 14 vidéos insérées';
END $$;