// apps\web\app\(coiffeur)\coiffeur\planning\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getCoiffeurBookings, CoiffeurBooking } from '@/lib/coiffeur/api';
import {
  BookingStatus,
  BOOKING_STATUS_COLORS,
  BOOKING_STATUS_LABELS,
  DAY_NAMES_SHORT,
} from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-SN', {
    hour: '2-digit', minute: '2-digit',
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

// ─── Page principale ──────────────────────────────────────
export default function PlanningPage() {
  const [bookings,      setBookings]      = useState<CoiffeurBooking[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [currentMonth,  setCurrentMonth]  = useState(() => new Date());
  const [selectedDay,   setSelectedDay]   = useState<Date | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<CoiffeurBooking[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCoiffeurBookings('all');
      setBookings(data);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sélectionner aujourd'hui par défaut
  useEffect(() => {
    if (!selectedDay) {
      const today = new Date();
      setSelectedDay(today);
    }
  }, [selectedDay]);

  // Mettre à jour les RDV du jour sélectionné
  useEffect(() => {
    if (!selectedDay) return;
    const dayBookings = bookings.filter((b) =>
      isSameDay(new Date(b.bookedAt), selectedDay) &&
      ![BookingStatus.CANCELLED].includes(b.status),
    );
    setSelectedBookings(dayBookings.sort(
      (a, b) => new Date(a.bookedAt).getTime() - new Date(b.bookedAt).getTime(),
    ));
  }, [selectedDay, bookings]);

  // ─── Génération du calendrier ────────────────────────────
  const getDaysInMonth = (date: Date): (Date | null)[] => {
    const year  = date.getFullYear();
    const month = date.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);

    // Décalage pour commencer le lundi (1) au lieu de dimanche (0)
    let startDay = first.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const today = new Date();

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  };

  // Compter les RDV par jour (hors annulés)
  const countByDay = (date: Date): number =>
    bookings.filter(
      (b) =>
        isSameDay(new Date(b.bookedAt), date) &&
        ![BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(b.status),
    ).length;

  const monthLabel = currentMonth.toLocaleDateString('fr-SN', {
    month: 'long', year: 'numeric',
  });

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Planning</h1>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Calendrier ─────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">

            {/* Navigation mois */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={prevMonth}
                className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700"
              >
                ←
              </button>
              <h2 className="text-white font-bold capitalize">{monthLabel}</h2>
              <button
                onClick={nextMonth}
                className="text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-700"
              >
                →
              </button>
            </div>

            {/* En-têtes jours */}
            <div className="grid grid-cols-7 mb-2">
              {DAY_NAMES_SHORT.slice(1).concat(DAY_NAMES_SHORT[0]).map((d) => (
                <div key={d} className="text-center text-gray-500 text-xs font-medium py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Jours */}
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => {
                  if (!day) return <div key={`empty-${i}`} />;

                  const count      = countByDay(day);
                  const isToday    = isSameDay(day, today);
                  const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                  const isPast     = day < today && !isToday;

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDay(day)}
                      className={`relative h-12 rounded-xl flex flex-col items-center justify-center transition-colors text-sm ${
                        isSelected
                          ? 'bg-white text-gray-900 font-bold'
                          : isToday
                          ? 'bg-gray-700 text-white font-bold ring-2 ring-white/30'
                          : isPast
                          ? 'text-gray-600 hover:bg-gray-700'
                          : 'text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <span>{day.getDate()}</span>
                      {count > 0 && (
                        <span className={`text-xs font-bold leading-none mt-0.5 ${
                          isSelected ? 'text-gray-600' : 'text-green-400'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Légende */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="text-green-400 text-sm font-bold">3</span>
                <span className="text-gray-500 text-xs">= nb RDV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-white" />
                <span className="text-gray-500 text-xs">Jour sélectionné</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gray-700 ring-2 ring-white/30" />
                <span className="text-gray-500 text-xs">Aujourd'hui</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RDV du jour sélectionné ─────────────────── */}
        <div>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-1">
              {selectedDay
                ? selectedDay.toLocaleDateString('fr-SN', {
                    weekday: 'long', day: 'numeric', month: 'long',
                  })
                : 'Sélectionnez un jour'}
            </h3>
            <p className="text-gray-400 text-xs mb-4">
              {selectedBookings.length} RDV
            </p>

            {selectedBookings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">🌿</p>
                <p className="text-gray-500 text-sm">Aucun RDV ce jour</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/coiffeur/rdv?id=${booking.id}&filter=all`}
                    className="block bg-gray-900 border border-gray-700 rounded-xl p-3 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-white font-bold text-sm">
                        {formatTime(booking.bookedAt)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        BOOKING_STATUS_COLORS[booking.status]
                      }`}>
                        {BOOKING_STATUS_LABELS[booking.status]}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm truncate">
                      {booking.service?.name}
                    </p>
                    {booking.client && (
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        👤 {booking.client.firstName} {booking.client.lastName}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}