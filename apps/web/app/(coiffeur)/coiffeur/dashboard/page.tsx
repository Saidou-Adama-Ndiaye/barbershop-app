// apps\web\app\(coiffeur)\coiffeur\dashboard\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getDashboard, DashboardStats, CoiffeurBooking,
} from '@/lib/coiffeur/api';
import {
  BookingStatus,
  BOOKING_STATUS_LABELS,
  BOOKING_STATUS_COLORS,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-SN', {
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-SN').format(amount) + ' F CFA';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-SN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ─── Composant carte stat ─────────────────────────────────
function StatCard({
  label, value, sub, icon, accent = false,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  icon:    string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${
      accent
        ? 'bg-white border-white/20 text-gray-900'
        : 'bg-gray-800 border-gray-700 text-white'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {accent && (
          <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            Ce mois
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-gray-900' : 'text-white'}`}>
        {value}
      </p>
      <p className={`text-sm mt-1 ${accent ? 'text-gray-500' : 'text-gray-400'}`}>
        {label}
      </p>
      {sub && (
        <p className={`text-xs mt-0.5 ${accent ? 'text-gray-400' : 'text-gray-500'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Composant carte RDV ──────────────────────────────────
function BookingCard({ booking }: { booking: CoiffeurBooking }) {
  const isPast    = new Date(booking.bookedAt) < new Date();
  const isNext    = !isPast &&
    ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(booking.status);

  return (
    <div className={`bg-gray-800 border rounded-xl p-4 transition-colors ${
      isNext ? 'border-white/30' : 'border-gray-700'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Heure */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-bold text-lg">
              {formatTime(booking.bookedAt)}
            </span>
            <span className="text-gray-500 text-sm">
              → {formatTime(booking.endAt)}
            </span>
            {isNext && (
              <span className="bg-white text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
                Prochain
              </span>
            )}
          </div>

          {/* Service */}
          <p className="text-white font-medium truncate">
            {booking.service?.name ?? 'Service'}
          </p>

          {/* Client */}
          {booking.client && (
            <p className="text-gray-400 text-sm mt-0.5">
              👤 {booking.client.firstName} {booking.client.lastName}
            </p>
          )}

          {/* Notes client */}
          {booking.notes && (
            <p className="text-gray-500 text-xs mt-1 truncate">
              💬 {booking.notes}
            </p>
          )}
        </div>

        {/* Statut */}
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
          BOOKING_STATUS_COLORS[booking.status]
        }`}>
          {BOOKING_STATUS_LABELS[booking.status]}
        </span>
      </div>

      {/* Actions rapides */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <Link
          href={`/coiffeur/rdv?id=${booking.id}`}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Voir le détail →
        </Link>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function DashboardPage() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboard();
      setStats(data);
    } catch {
      setError('Impossible de charger le dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ─── Erreur ─────────────────────────────────────────────
  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-white font-medium mb-2">Erreur de chargement</p>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={load}
          className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('fr-SN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Prochain RDV
  const nextBooking = stats.today.next;
  const minutesUntilNext = nextBooking
    ? Math.round((new Date(nextBooking.bookedAt).getTime() - Date.now()) / 60000)
    : null;

  return (
    <div className="space-y-8 max-w-6xl">

      {/* ─── Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1 capitalize">{today}</p>
        </div>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* ─── Alerte prochain RDV ────────────────────── */}
      {nextBooking && minutesUntilNext !== null && minutesUntilNext <= 60 && (
        <div className={`rounded-2xl p-4 border flex items-center gap-4 ${
          minutesUntilNext <= 15
            ? 'bg-red-900/30 border-red-500/30'
            : 'bg-amber-900/30 border-amber-500/30'
        }`}>
          <span className="text-3xl">{minutesUntilNext <= 15 ? '🚨' : '⏰'}</span>
          <div className="flex-1">
            <p className={`font-bold ${minutesUntilNext <= 15 ? 'text-red-300' : 'text-amber-300'}`}>
              {minutesUntilNext <= 15
                ? `RDV imminent dans ${minutesUntilNext} min !`
                : `Prochain RDV dans ${minutesUntilNext} min`}
            </p>
            <p className="text-gray-400 text-sm">
              {nextBooking.service?.name} — {formatTime(nextBooking.bookedAt)}
              {nextBooking.client && ` — ${nextBooking.client.firstName} ${nextBooking.client.lastName}`}
            </p>
          </div>
          <Link
            href={`/coiffeur/rdv?id=${nextBooking.id}`}
            className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shrink-0"
          >
            Voir →
          </Link>
        </div>
      )}

      {/* ─── Stats cards ────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="📋"
          label="RDV aujourd'hui"
          value={String(stats.today.count)}
          sub={`${stats.today.bookings.filter(b => b.status === BookingStatus.COMPLETED).length} terminé(s)`}
        />
        <StatCard
          icon="📅"
          label="RDV cette semaine"
          value={String(stats.week.count)}
          sub={formatCurrency(stats.week.revenue) + ' CA'}
        />
        <StatCard
          icon="👥"
          label="Clients uniques"
          value={String(stats.uniqueClients)}
          sub="ce mois-ci"
        />
        <StatCard
          icon="💰"
          label="CA ce mois"
          value={formatCurrency(stats.month.revenue)}
          sub={`${stats.month.count} RDV terminés`}
          accent
        />
      </div>

      {/* ─── Planning du jour ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            Planning du jour
            <span className="ml-2 text-sm font-normal text-gray-400">
              ({stats.today.count} RDV)
            </span>
          </h2>
          <Link
            href="/coiffeur/rdv"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Voir tous les RDV →
          </Link>
        </div>

        {stats.today.bookings.length === 0 ? (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">🌿</p>
            <p className="text-white font-medium">Aucun RDV aujourd'hui</p>
            <p className="text-gray-400 text-sm mt-1">Profitez de cette journée !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.today.bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* ─── RDV de la semaine (aperçu) ─────────────── */}
      {stats.week.bookings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Cette semaine
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({stats.week.count} RDV — {formatCurrency(stats.week.revenue)})
              </span>
            </h2>
            <Link
              href="/coiffeur/rdv?filter=week"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Voir le planning →
            </Link>
          </div>

          {/* Grouper par jour */}
          {(() => {
            const grouped = stats.week.bookings.reduce<Record<string, CoiffeurBooking[]>>(
              (acc, b) => {
                const day = new Date(b.bookedAt).toLocaleDateString('fr-SN', {
                  weekday: 'long', day: 'numeric', month: 'short',
                });
                if (!acc[day]) acc[day] = [];
                acc[day].push(b);
                return acc;
              },
              {},
            );

            return Object.entries(grouped).slice(0, 3).map(([day, bookings]) => (
              <div key={day} className="mb-4">
                <p className="text-gray-400 text-xs font-medium uppercase mb-2 capitalize">
                  {day}
                </p>
                <div className="space-y-2">
                  {bookings.slice(0, 2).map((b) => (
                    <div
                      key={b.id}
                      className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white text-sm font-medium w-12">
                          {formatTime(b.bookedAt)}
                        </span>
                        <span className="text-gray-300 text-sm">
                          {b.service?.name}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        BOOKING_STATUS_COLORS[b.status]
                      }`}>
                        {BOOKING_STATUS_LABELS[b.status]}
                      </span>
                    </div>
                  ))}
                  {bookings.length > 2 && (
                    <p className="text-gray-500 text-xs pl-4">
                      +{bookings.length - 2} autre(s)
                    </p>
                  )}
                </div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}