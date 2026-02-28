-- ============================================================
-- BarberShop — Sprint 6 : Notification Logs
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR(100) NOT NULL DEFAULT 'email',
  template   VARCHAR(100),
  recipient  VARCHAR(255) NOT NULL,
  subject    TEXT,
  status     VARCHAR(50) DEFAULT 'sent',
  sent_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata   JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id  ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type     ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_template ON notification_logs(template);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at  ON notification_logs(sent_at DESC);

RAISE NOTICE '✅ Sprint 6 : table notification_logs créée';