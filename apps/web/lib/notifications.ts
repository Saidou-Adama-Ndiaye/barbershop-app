import api from './api';

// ─── Types ────────────────────────────────────────────────
export interface UserNotification {
  id:        string;
  type:      string;
  template:  string | null;
  subject:   string | null;
  status:    string;
  sentAt:    string;
  metadata:  Record<string, unknown>;
}

// ─── Config visuelle par template ─────────────────────────
export const NOTIFICATION_CONFIG: Record <
  string,
  { icon: string; label: string }
> = {
  'booking-confirmation': { icon: '✅', label: 'Réservation confirmée'  },
  'reminder-24h':         { icon: '⏰', label: 'Rappel RDV (24h)'       },
  'rappel-1h':            { icon: '⏰', label: 'Rappel RDV (1h)'        },
  'order-shipped':        { icon: '🚚', label: 'Commande expédiée'      },
  'stock-alert':          { icon: '📉', label: 'Alerte stock'           },
  'verify-email':         { icon: '📧', label: 'Vérification email'     },
  'forgot-password':      { icon: '🔑', label: 'Réinitialisation MDP'   },
  'password-changed':     { icon: '🔒', label: 'Mot de passe modifié'   },
  'nouveau-rdv':          { icon: '📅', label: 'Nouveau RDV'            },
};

export const getNotificationMeta = (
  template: string | null,
): { icon: string; label: string } =>
  NOTIFICATION_CONFIG[template ?? ''] ?? { icon: '🔔', label: 'Notification' };

// ─── Appels API ───────────────────────────────────────────
export const fetchMyNotifications = async (
  limit = 20,
): Promise<UserNotification[]> => {
  const { data } = await api.get<UserNotification[]>(
    `/notifications/me?limit=${limit}`,
  );
  return data;
};