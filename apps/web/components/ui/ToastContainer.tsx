// apps/web/components/ui/ToastContainer.tsx
'use client';

import { useEffect, useState } from 'react';
import { useToastStore, Toast, ToastType } from '@/lib/store/toast.store';

// ─── Config visuelle par type ─────────────────────────────
const TOAST_CONFIG: Record <
  ToastType,
  { icon: string; bg: string; border: string; text: string; bar: string }
> = {
  success: {
    icon:   '✅',
    bg:     'bg-gray-900',
    border: 'border-green-700',
    text:   'text-green-300',
    bar:    'bg-green-500',
  },
  error: {
    icon:   '❌',
    bg:     'bg-gray-900',
    border: 'border-red-700',
    text:   'text-red-300',
    bar:    'bg-red-500',
  },
  warning: {
    icon:   '⚠️',
    bg:     'bg-gray-900',
    border: 'border-amber-700',
    text:   'text-amber-300',
    bar:    'bg-amber-500',
  },
  info: {
    icon:   'ℹ️',
    bg:     'bg-gray-900',
    border: 'border-blue-700',
    text:   'text-blue-300',
    bar:    'bg-blue-500',
  },
};

// ─── Toast individuel ─────────────────────────────────────
function ToastItem({ toast }: { toast: Toast }) {
  const remove          = useToastStore((s) => s.remove);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cfg = TOAST_CONFIG[toast.type];

  // Entrée : légère animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Sortie : déclencher l'animation avant suppression
  const handleClose = () => {
    setLeaving(true);
    setTimeout(() => remove(toast.id), 300);
  };

  // Barre de progression
  const [progress, setProgress] = useState(100);
  useEffect(() => {
    const start    = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [toast.duration]);

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-start gap-3
        ${cfg.bg} border ${cfg.border}
        rounded-xl px-4 py-3 shadow-2xl
        min-w-[280px] max-w-[380px]
        transition-all duration-300 ease-out
        ${visible && !leaving
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
        }
      `}
    >
      {/* Icône */}
      <span className="text-lg flex-shrink-0 mt-0.5">{cfg.icon}</span>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium ${cfg.text} leading-snug`}>
        {toast.message}
      </p>

      {/* Bouton fermer */}
      <button
        onClick={handleClose}
        className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 text-lg leading-none ml-1"
        aria-label="Fermer"
      >
        ×
      </button>

      {/* Barre de progression */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-800">
        <div
          className={`h-full ${cfg.bar} transition-all ease-linear`}
          style={{ width: `${progress}%`, transitionDuration: '50ms' }}
        />
      </div>
    </div>
  );
}

// ─── Conteneur principal ──────────────────────────────────
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}