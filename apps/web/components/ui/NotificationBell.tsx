'use client';

import { useEffect, useRef } from 'react';
import { useNotificationsStore } from '@/lib/store/notifications.store';
import { getNotificationMeta }   from '@/lib/notifications';

// ─── Formatage date relative ──────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min  = Math.floor(diff / 60_000);
  const h    = Math.floor(diff / 3_600_000);
  const d    = Math.floor(diff / 86_400_000);

  if (min < 1)  return 'À l\'instant';
  if (min < 60) return `Il y a ${min} min`;
  if (h   < 24) return `Il y a ${h}h`;
  if (d   < 7)  return `Il y a ${d}j`;
  return new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit', month: 'short',
  }).format(new Date(dateStr));
}

// ─── Composant principal ──────────────────────────────────
export default function NotificationBell() {
  const {
    notifications,
    unreadIds,
    isLoading,
    isOpen,
    fetch,
    toggle,
    close,
    markAllRead,
    markRead,
  } = useNotificationsStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const unreadCount = unreadIds.size;

  // ─── Fetch au montage ──────────────────────────────────
  useEffect(() => {
    fetch();
  }, [fetch]);

  // ─── Fermer en cliquant en dehors ─────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // ─── Fermer avec Escape ────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  return (
    <div className="relative">

      {/* ── Bouton cloche ──────────────────────────────── */}
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        {/* Icône cloche — animée si non-lues */}
        <span
          className={`text-xl transition-transform duration-300 ${
            unreadCount > 0 && !isOpen ? 'animate-bounce' : ''
          }`}
        >
          🔔
        </span>

        {/* Badge non-lues */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Panneau déroulant ──────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >

          {/* Header panneau */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 text-sm">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Tout lire
              </button>
            )}
          </div>

          {/* Liste notifications */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              // Skeleton loading
              <div className="p-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              // État vide
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔕</p>
                <p className="text-sm text-gray-400">Aucune notification</p>
              </div>
            ) : (
              // Liste
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => {
                  const { icon, label } = getNotificationMeta(notif.template);
                  const isUnread        = unreadIds.has(notif.id);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                        isUnread ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Icône */}
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">
                        {icon}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs font-semibold leading-snug truncate ${
                            isUnread ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {label}
                          </p>
                          {/* Point non-lu */}
                          {isUnread && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        {notif.subject && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {notif.subject}
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          {timeAgo(notif.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                onClick={() => { fetch(50); }}
                className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
              >
                Charger plus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}