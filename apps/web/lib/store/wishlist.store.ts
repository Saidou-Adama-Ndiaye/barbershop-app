// apps/web/lib/store/wishlist.store.ts
import { create } from 'zustand';
import { toggleWishlist, getWishlistIds } from '../wishlist';

interface WishlistState {
  packIds: Set<string>;
  isLoading: boolean;

  // Actions
  loadIds:       (userId?: string) => Promise<void>;
  toggle:        (packId: string) => Promise<void>;
  isInWishlist:  (packId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  packIds:   new Set(),
  isLoading: false,

  // Charger les IDs au montage (si connecté)
  loadIds: async () => {
    try {
      set({ isLoading: true });
      const ids = await getWishlistIds();
      set({ packIds: new Set(ids) });
    } catch {
      // Non connecté → wishlist vide silencieusement
      set({ packIds: new Set() });
    } finally {
      set({ isLoading: false });
    }
  },

  // Toggle optimiste : mise à jour immédiate de l'UI
  toggle: async (packId: string) => {
    const current = get().packIds;
    const wasIn   = current.has(packId);

    // Mise à jour optimiste
    const newIds = new Set(current);
    if (wasIn) {
      newIds.delete(packId);
    } else {
      newIds.add(packId);
    }
    set({ packIds: newIds });

    try {
      await toggleWishlist(packId);
    } catch {
      // Rollback si erreur API
      set({ packIds: current });
    }
  },

  isInWishlist: (packId: string) => get().packIds.has(packId),
}));