// apps\web\app\(coiffeur)\coiffeur\rdv\page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getCoiffeurBookings, updateBookingStatus, updateBookingNotes,
  CoiffeurBooking,
} from '@/lib/coiffeur/api';
import {
  BookingStatus,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────
function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-SN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-SN', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' F CFA';
}

// ─── Transitions autorisées ───────────────────────────────
const NEXT_ACTIONS: Partial<Record<BookingStatus, {
  status: BookingStatus;
  label:  string;
  icon:   string;
  color:  string;
}[]>> = {
  [BookingStatus.DEPOSIT_PAID]: [
    { status: BookingStatus.CONFIRMED,   label: 'Confirmer',  icon: '✅', color: 'bg-green-600 hover:bg-green-500' },
  ],
  [BookingStatus.CONFIRMED]: [
    { status: BookingStatus.IN_PROGRESS, label: 'Démarrer',   icon: '▶️', color: 'bg-blue-600 hover:bg-blue-500'  },
    { status: BookingStatus.NO_SHOW,     label: 'No-show',    icon: '🚫', color: 'bg-orange-600 hover:bg-orange-500' },
  ],
  [BookingStatus.IN_PROGRESS]: [
    { status: BookingStatus.COMPLETED,   label: 'Terminer',   icon: '🏁', color: 'bg-emerald-600 hover:bg-emerald-500' },
  ],
};

// ─── Dialog confirmation ──────────────────────────────────
function ConfirmDialog({
  open, label, icon, onConfirm, onCancel, loading,
}: {
  open:      boolean;
  label:     string;
  icon:      string;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
        <p className="text-3xl text-center mb-3">{icon}</p>
        <h3 className="text-white font-bold text-center text-lg mb-2">Confirmation</h3>
        <p className="text-gray-400 text-center text-sm mb-6">
          Confirmer l'action : <strong className="text-white">{label}</strong> ?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            ) : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fiche RDV ────────────────────────────────────────────
function BookingDetail({
  booking,
  onStatusUpdate,
  onClose,
}: {
  booking:        CoiffeurBooking;
  onStatusUpdate: (id: string, status: BookingStatus) => Promise<void>;
  onClose:        () => void;
}) {
  const [notes,        setNotes]        = useState(booking.staffNotes ?? '');
  const [notesSaved,   setNotesSaved]   = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [dialog, setDialog] = useState<{
    open: boolean; status: BookingStatus; label: string; icon: string;
  }>({ open: false, status: BookingStatus.PENDING, label: '', icon: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const actions = NEXT_ACTIONS[booking.status] ?? [];

  const handleAction = (action: { status: BookingStatus; label: string; icon: string }) => {
    setDialog({ open: true, ...action });
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      await onStatusUpdate(booking.id, dialog.status);
      setDialog((d) => ({ ...d, open: false }));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesLoading(true);
    try {
      await updateBookingNotes(booking.id, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      // silencieux
    } finally {
      setNotesLoading(false);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={dialog.open}
        label={dialog.label}
        icon={dialog.icon}
        onConfirm={handleConfirm}
        onCancel={() => setDialog((d) => ({ ...d, open: false }))}
        loading={actionLoading}
      />

      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-400 text-xs font-mono">{booking.bookingNumber}</p>
            <h3 className="text-white font-bold text-lg mt-0.5">
              {booking.service?.name ?? 'Service'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              BOOKING_STATUS_COLORS[booking.status]
            }`}>
              {BOOKING_STATUS_LABELS[booking.status]}
            </span>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Infos */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">Date & heure</p>
            <p className="text-white font-medium">{formatDateTime(booking.bookedAt)}</p>
            <p className="text-gray-400 text-xs">→ {formatTime(booking.endAt)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-3">
            <p className="text-gray-500 text-xs mb-1">Durée & Prix</p>
            <p className="text-white font-medium">{booking.service?.durationMin ?? '?'} min</p>
            <p className="text-gray-400 text-xs">{formatCurrency(Number(booking.totalPrice))}</p>
          </div>
          {booking.client && (
            <div className="bg-gray-900 rounded-xl p-3 col-span-2">
              <p className="text-gray-500 text-xs mb-1">Client</p>
              <p className="text-white font-medium">
                {booking.client.firstName} {booking.client.lastName}
              </p>
              <p className="text-gray-400 text-xs">{booking.client.email}</p>
              {booking.client.phone && (
                <p className="text-gray-400 text-xs">{booking.client.phone}</p>
              )}
            </div>
          )}
        </div>

        {/* Notes client */}
        {booking.notes && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-3">
            <p className="text-amber-300 text-xs font-medium mb-1">📝 Notes du client</p>
            <p className="text-amber-100 text-sm">{booking.notes}</p>
          </div>
        )}

        {/* Notes privées coiffeur */}
        <div>
          <label className="block text-gray-400 text-xs font-medium mb-2">
            🔒 Notes privées (invisibles au client)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Préférences du client, observations..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gray-500 resize-none placeholder-gray-600"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSaveNotes}
              disabled={notesLoading}
              className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {notesSaved ? '✅ Sauvegardé' : notesLoading ? 'Sauvegarde...' : '💾 Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex gap-2 pt-2 border-t border-gray-700">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => handleAction(action)}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 ${action.color}`}
              >
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function RdvPage() {
  const searchParams = useSearchParams();
  const initialId    = searchParams.get('id');
  const initialFilter = (searchParams.get('filter') as 'today' | 'week' | 'month' | 'all') ?? 'today';

  const [filter,   setFilter]   = useState<'today' | 'week' | 'month' | 'all'>(initialFilter);
  const [bookings, setBookings] = useState<CoiffeurBooking[]>([]);
  const [selected, setSelected] = useState<CoiffeurBooking | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCoiffeurBookings(filter);
      setBookings(data);
      // Ouvrir automatiquement si ?id= dans l'URL
      if (initialId) {
        const found = data.find((b) => b.id === initialId);
        if (found) setSelected(found);
      }
    } catch {
      setError('Impossible de charger les RDV');
    } finally {
      setLoading(false);
    }
  }, [filter, initialId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusUpdate = async (id: string, status: BookingStatus) => {
    await updateBookingStatus(id, status);
    // Recharger + mettre à jour le selected
    const updated = await getCoiffeurBookings(filter);
    setBookings(updated);
    const updatedSelected = updated.find((b) => b.id === id);
    if (updatedSelected) setSelected(updatedSelected);
  };

  // ─── Filtres labels ──────────────────────────────────────
  const filterLabels = {
    today: "Aujourd'hui",
    week:  'Cette semaine',
    month: 'Ce mois',
    all:   'Tous',
  };

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Mes RDV</h1>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 bg-gray-900 p-1 rounded-xl w-fit">
        {(Object.keys(filterLabels) as (keyof typeof filterLabels)[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-white text-gray-900'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Liste RDV ──────────────────────────────── */}
        <div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-gray-400">{error}</p>
              <button onClick={load} className="text-white text-sm mt-3 underline">
                Réessayer
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-2xl">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-white font-medium">Aucun RDV</p>
              <p className="text-gray-400 text-sm mt-1">
                Aucun rendez-vous pour ce filtre
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm mb-3">
                {bookings.length} rendez-vous
              </p>
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelected(booking)}
                  className={`w-full text-left bg-gray-800 border rounded-xl px-4 py-3 transition-colors ${
                    selected?.id === booking.id
                      ? 'border-white/40 bg-gray-700'
                      : 'border-gray-700 hover:border-gray-600 hover:bg-gray-750'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">
                          {new Date(booking.bookedAt).toLocaleTimeString('fr-SN', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                        <span className="text-gray-400 text-sm truncate">
                          {booking.service?.name}
                        </span>
                      </div>
                      {booking.client && (
                        <p className="text-gray-500 text-xs mt-0.5 truncate">
                          👤 {booking.client.firstName} {booking.client.lastName}
                        </p>
                      )}
                      <p className="text-gray-600 text-xs mt-0.5 truncate">
                        {new Date(booking.bookedAt).toLocaleDateString('fr-SN', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        BOOKING_STATUS_COLORS[booking.status]
                      }`}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </span>
                      {booking.staffNotes && (
                        <span className="text-xs text-gray-500">📝 notes</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Fiche RDV ──────────────────────────────── */}
        <div className="lg:sticky lg:top-8 self-start">
          {selected ? (
            <BookingDetail
              booking={selected}
              onStatusUpdate={handleStatusUpdate}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="bg-gray-800 border border-gray-700 border-dashed rounded-2xl p-12 text-center">
              <p className="text-3xl mb-3">👆</p>
              <p className="text-gray-400 text-sm">
                Cliquez sur un RDV pour voir le détail
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}