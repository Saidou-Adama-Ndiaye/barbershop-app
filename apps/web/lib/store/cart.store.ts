import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────
export interface CartItem {
  packId: string;
  packName: string;
  packSlug: string;
  quantity: number;
  unitPrice: number; // prix final après réduction et personnalisation
  customizations?: {
    additions: string[];
    removals: string[];
  };
}

interface CartState {
  items: CartItem[];

  // Computed
  totalItems: number;
  totalAmount: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (packId: string) => void;
  updateQty: (packId: string, quantity: number) => void;
  updateCustomizations: (
    packId: string,
    customizations: CartItem['customizations'],
    newPrice: number,
  ) => void;
  clear: () => void;
}

// ─── Helper : recalculer les totaux ──────────────────────
const computeTotals = (items: CartItem[]) => ({
  totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
  totalAmount: items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
});

// ─── Store ────────────────────────────────────────────────
export const useCartStore = create<CartState>((set) => ({
  items: [],
  totalItems: 0,
  totalAmount: 0,

  addItem: (item: CartItem) =>
    set((state) => {
      const existing = state.items.find((i) => i.packId === item.packId);
      let newItems: CartItem[];

      if (existing) {
        // Si déjà dans le panier → incrémenter la quantité
        newItems = state.items.map((i) =>
          i.packId === item.packId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        );
      } else {
        newItems = [...state.items, item];
      }

      return { items: newItems, ...computeTotals(newItems) };
    }),

  removeItem: (packId: string) =>
    set((state) => {
      const newItems = state.items.filter((i) => i.packId !== packId);
      return { items: newItems, ...computeTotals(newItems) };
    }),

  updateQty: (packId: string, quantity: number) =>
    set((state) => {
      if (quantity <= 0) {
        const newItems = state.items.filter((i) => i.packId !== packId);
        return { items: newItems, ...computeTotals(newItems) };
      }
      const newItems = state.items.map((i) =>
        i.packId === packId ? { ...i, quantity } : i,
      );
      return { items: newItems, ...computeTotals(newItems) };
    }),

  updateCustomizations: (
    packId: string,
    customizations: CartItem['customizations'],
    newPrice: number,
  ) =>
    set((state) => {
      const newItems = state.items.map((i) =>
        i.packId === packId
          ? { ...i, customizations, unitPrice: newPrice }
          : i,
      );
      return { items: newItems, ...computeTotals(newItems) };
    }),

  clear: () => set({ items: [], totalItems: 0, totalAmount: 0 }),
}));