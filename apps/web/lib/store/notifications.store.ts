import { create } from 'zustand';
import {
  fetchMyNotifications,
  UserNotification,
} from '../notifications';

// ─── Types ────────────────────────────────────────────────
interface NotificationsState {
  notifications: UserNotification[];
  unreadIds:     Set<string>;
  isLoading:     boolean;
  isOpen:        boolean;
  lastFetchedAt: number | null;

  // Actions
  fetch:       (limit?: number) => Promise<void>;
  markAllRead: () => void;
  markRead:    (id: string) => void;
  toggle:      () => void;
  close:       () => void;
}

// ─── Store ────────────────────────────────────────────────
export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadIds:     new Set(),
  isLoading:     false,
  isOpen:        false,
  lastFetchedAt: null,

  // ─── Fetch depuis l'API ──────────────────────────────
  fetch: async (limit = 20) => {
    // Éviter les refetch trop fréquents (cooldown 30s)
    const now     = Date.now();
    const last    = get().lastFetchedAt;
    if (last && now - last < 30_000) return;

    set({ isLoading: true });
    try {
      const notifications = await fetchMyNotifications(limit);

      // Toutes les nouvelles notifs depuis le dernier fetch → non lues
      const existingIds = new Set(get().notifications.map((n) => n.id));
      const newIds      = notifications
        .filter((n) => !existingIds.has(n.id))
        .map((n) => n.id);

      // Premier chargement : les 3 plus récentes sont "non lues"
      const isFirstLoad = get().notifications.length === 0;
      const unreadIds   = isFirstLoad
        ? new Set(notifications.slice(0, 3).map((n) => n.id))
        : new Set(Array.from(get().unreadIds).concat(newIds));

      set({ notifications, unreadIds, isLoading: false, lastFetchedAt: now });
    } catch {
      set({ isLoading: false });
    }
  },

  // ─── Marquer toutes comme lues ───────────────────────
  markAllRead: () => set({ unreadIds: new Set() }),

  // ─── Marquer une comme lue ───────────────────────────
  markRead: (id) =>
    set((state) => {
      const next = new Set(state.unreadIds);
      next.delete(id);
      return { unreadIds: next };
    }),

  // ─── Ouvrir/fermer le panneau ────────────────────────
  toggle: () => {
    const willOpen = !get().isOpen;
    set({ isOpen: willOpen });
    // Marquer tout comme lu à l'ouverture
    if (willOpen) {
      setTimeout(() => get().markAllRead(), 2000);
    }
  },

  close: () => set({ isOpen: false }),
}));