// apps\web\app\(coiffeur)\coiffeur\clients\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getClients, getClientHistory,
  ClientSummary, CoiffeurBooking,
} from '@/lib/coiffeur/api';
import {
  BookingStatus,
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
} from '@/lib/types';
import { updateBookingNotes } from '@/lib/coiffeur/api';

// ─── Helpers ──────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-SN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-SN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-SN').format(n) + ' F CFA';
}

// ─── Composant fiche client ───────────────────────────────
function ClientDetail({
  client,
  onClose,
}: {
  client:  ClientSummary;
  onClose: () => void;
}) {
  const [bookings, setBookings] = useState<CoiffeurBooking[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText,    setNoteText]    = useState('');
  const [noteSaved,   setNoteSaved]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { bookings: data } = await getClientHistory(client.clientId);
        setBookings(data);
      } catch {
        // silencieux
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [client.clientId]);

  const handleSaveNote = async (bookingId: string) => {
    await updateBookingNotes(bookingId, noteText);
    // Mettre à jour localement
    setBookings((prev) =>
      prev.map((b) => b.id === bookingId ? { ...b, staffNotes: noteText } : b),
    );
    setEditingNote(null);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const totalRevenue = bookings
    .filter((b) => b.status === BookingStatus.COMPLETED)
    .reduce((sum, b) => sum + Number(b.totalPrice), 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
            {client.firstName[0]}{client.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold">
                {client.firstName} {client.lastName}
              </h3>
              {client.isRecurrent && (
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full font-medium">
                  ⭐ Récurrent
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{client.email}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Stats client */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-xl">{client.totalRdv}</p>
          <p className="text-gray-400 text-xs mt-0.5">RDV total</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-xl">
            {bookings.filter((b) => b.status === BookingStatus.COMPLETED).length}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">Terminés</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <p className="text-white font-bold text-sm mt-1">
            {formatCurrency(totalRevenue)}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">CA total</p>
        </div>
      </div>

      {/* Dernier RDV */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">Dernier RDV :</span>
        <span className="text-gray-300">{formatDate(client.lastRdv)}</span>
      </div>

      {noteSaved && (
        <div className="bg-green-900/30 border border-green-700/30 rounded-xl p-2 text-green-300 text-xs text-center">
          ✅ Note sauvegardée
        </div>
      )}

      {/* Timeline RDV */}
      <div>
        <p className="text-gray-400 text-xs font-medium mb-3 uppercase">
          Historique des RDV
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-700 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Aucun historique disponible
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {bookings.map((booking, idx) => (
              <div
                key={booking.id}
                className="relative pl-5 border-l-2 border-gray-700"
              >
                {/* Point timeline */}
                <div className={`absolute -left-1.5 top-1.5 w-3 h-3 rounded-full border-2 border-gray-800 ${
                  booking.status === BookingStatus.COMPLETED
                    ? 'bg-green-500'
                    : booking.status === BookingStatus.CANCELLED
                    ? 'bg-red-500'
                    : booking.status === BookingStatus.NO_SHOW
                    ? 'bg-orange-500'
                    : 'bg-gray-500'
                }`} />

                <div className="bg-gray-900 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-gray-300 text-sm font-medium">
                      {formatDateTime(booking.bookedAt)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      BOOKING_STATUS_COLORS[booking.status]
                    }`}>
                      {BOOKING_STATUS_LABELS[booking.status]}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    {booking.service?.name}
                    {booking.status === BookingStatus.COMPLETED && (
                      <span className="text-gray-500 ml-2">
                        — {formatCurrency(Number(booking.totalPrice))}
                      </span>
                    )}
                  </p>

                  {/* Notes privées */}
                  {editingNote === booking.id ? (
                    <div className="mt-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={2}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs outline-none focus:border-gray-500 resize-none"
                        placeholder="Notes privées..."
                        autoFocus
                      />
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleSaveNote(booking.id)}
                          className="text-xs bg-white text-gray-900 px-2 py-1 rounded font-medium"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => setEditingNote(null)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      {booking.staffNotes ? (
                        <p className="text-gray-500 text-xs italic truncate flex-1">
                          🔒 {booking.staffNotes}
                        </p>
                      ) : (
                        <p className="text-gray-600 text-xs flex-1">
                          Pas de notes
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setEditingNote(booking.id);
                          setNoteText(booking.staffNotes ?? '');
                        }}
                        className="text-xs text-gray-500 hover:text-gray-300 shrink-0"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function ClientsPage() {
  const [clients,  setClients]  = useState<ClientSummary[]>([]);
  const [filtered, setFiltered] = useState<ClientSummary[]>([]);
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClients();
      setClients(data);
      setFiltered(data);
    } catch {
      setError('Impossible de charger les clients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recherche
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      clients.filter((c) =>
        `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(q),
      ),
    );
  }, [search, clients]);

  const recurrentCount = clients.filter((c) => c.isRecurrent).length;

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-gray-400 text-sm mt-1">
            {clients.length} clients — {recurrentCount} récurrents
          </p>
        </div>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Recherche */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full max-w-md bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 outline-none focus:border-gray-500 placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ─── Liste clients ──────────────────────────── */}
        <div>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-gray-400">{error}</p>
              <button onClick={load} className="text-white text-sm mt-3 underline">
                Réessayer
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-2xl">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-white font-medium">Aucun client trouvé</p>
              {search && (
                <p className="text-gray-400 text-sm mt-1">
                  Aucun résultat pour "{search}"
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((client) => (
                <button
                  key={client.clientId}
                  onClick={() => setSelected(client)}
                  className={`w-full text-left bg-gray-800 border rounded-xl px-4 py-3 transition-colors ${
                    selected?.clientId === client.clientId
                      ? 'border-white/40 bg-gray-700'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar initiales */}
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {client.firstName[0]}{client.lastName[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">
                          {client.firstName} {client.lastName}
                        </p>
                        {client.isRecurrent && (
                          <span className="bg-amber-500/20 text-amber-300 text-xs px-1.5 py-0.5 rounded-full shrink-0">
                            ⭐
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{client.email}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-medium">{client.totalRdv} RDV</p>
                      <p className="text-gray-500 text-xs">
                        {formatDate(client.lastRdv)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Fiche client ───────────────────────────── */}
        <div className="lg:sticky lg:top-8 self-start">
          {selected ? (
            <ClientDetail
              client={selected}
              onClose={() => setSelected(null)}
            />
          ) : (
            <div className="bg-gray-800 border border-gray-700 border-dashed rounded-2xl p-12 text-center">
              <p className="text-3xl mb-3">👆</p>
              <p className="text-gray-400 text-sm">
                Cliquez sur un client pour voir sa fiche
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}