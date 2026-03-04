// apps/web/lib/store/toast.store.ts
import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id:       string;
  type:     ToastType;
  message:  string;
  duration: number; // ms
}

interface ToastState {
  toasts: Toast[];
  add:    (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
  clear:  () => void;
}

// ─── Store ────────────────────────────────────────────────
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (type, message, duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast: Toast = { id, type, message, duration };

    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-suppression après `duration` ms
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },

  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clear: () => set({ toasts: [] }),
}));

// ─── Hook raccourci ───────────────────────────────────────
export const useToast = () => {
  const { add } = useToastStore();
  return {
    success: (message: string, duration?: number) => add('success', message, duration),
    error:   (message: string, duration?: number) => add('error',   message, duration),
    warning: (message: string, duration?: number) => add('warning', message, duration),
    info:    (message: string, duration?: number) => add('info',    message, duration),
  };
};