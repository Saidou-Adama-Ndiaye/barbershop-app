'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Booking {
  id:            string;
  bookingNumber: string;
  clientId:      string;
  staffId:       string;
  bookedAt:      string;
  endAt:         string;
  status:        string;
  service:       { name: string; durationMin: number };
}

interface CalendarDay {
  date:     string;
  bookings: Booking[];
}

interface CalendarResponse {
  weekStart: string;
  weekEnd:   string;
  days:      CalendarDay[];
}

const statusColors: Record<string, string> = {
  pending:      'bg-amber-900/60 border-amber-600  text-amber-200',
  deposit_paid: 'bg-blue-900/60  border-blue-600   text-blue-200',
  confirmed:    'bg-green-900/60 border-green-600  text-green-200',
  cancelled:    'bg-gray-800     border-gray-600   text-gray-400',
  completed:    'bg-purple-900/60 border-purple-600 text-purple-200',
};

const statusLabels: Record<string, string> = {
  pending:      'En attente',
  deposit_paid: 'Acompte payé',
  confirmed:    'Confirmé',
  cancelled:    'Annulé',
  completed:    'Terminé',
};

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export default function AdminPlanningPage() {
  const [weekStart, setWeekStart]     = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Lundi
    return d.toISOString().split('T')[0];
  });
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-calendar', weekStart],
    queryFn:  async () => {
      const { data } = await api.get<CalendarResponse>('/admin/bookings/calendar', {
        params: { weekStart },
      });
      return data;
    },
  });

  const navigateWeek = (direction: -1 | 1) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + direction * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const formatTime = (isoStr: string) =>
    new Date(isoStr).toLocaleTimeString('fr-SN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    });

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Planning</h1>
          <p className="text-gray-400 mt-1">Calendrier hebdomadaire des réservations</p>
        </div>

        {/* Navigation semaine */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            ←
          </button>
          <span className="text-sm font-medium bg-gray-900 border border-gray-700 rounded-lg px-4 py-2">
            {data
              ? `${new Date(data.weekStart).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short' })} — ${new Date(data.weekEnd).toLocaleDateString('fr-SN', { day: 'numeric', month: 'short', year: 'numeric' })}`
              : 'Chargement...'}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Légende statuts */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusLabels).map(([key, label]) => (
          <span key={key} className={`text-xs px-3 py-1 rounded-full border ${statusColors[key]}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Grille calendrier */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {data?.days.map((day, i) => {
            const dateObj   = new Date(day.date);
            const isToday   = day.date === new Date().toISOString().split('T')[0];

            return (
              <div
                key={day.date}
                className={`bg-gray-900 rounded-xl border ${
                  isToday ? 'border-white' : 'border-gray-800'
                } min-h-48`}
              >
                {/* En-tête du jour */}
                <div className={`p-3 border-b ${isToday ? 'border-white/20' : 'border-gray-800'}`}>
                  <p className="text-gray-400 text-xs">{JOURS[i]}</p>
                  <p className={`font-bold text-lg ${isToday ? 'text-white' : 'text-gray-300'}`}>
                    {dateObj.getDate()}
                  </p>
                  {day.bookings.length > 0 && (
                    <span className="text-xs text-gray-500">
                      {day.bookings.length} RDV
                    </span>
                  )}
                </div>

                {/* RDV du jour */}
                <div className="p-2 space-y-1.5">
                  {day.bookings.length === 0 ? (
                    <p className="text-gray-600 text-xs text-center py-4">—</p>
                  ) : (
                    day.bookings.map((booking) => (
                      <button
                        key={booking.id}
                        onClick={() => setSelectedBooking(booking)}
                        className={`w-full text-left p-2 rounded-lg border text-xs transition-opacity hover:opacity-80 ${
                          statusColors[booking.status] ?? statusColors['pending']
                        }`}
                      >
                        <p className="font-semibold">
                          {formatTime(booking.bookedAt)}
                        </p>
                        <p className="truncate mt-0.5">
                          {booking.service?.name ?? 'Service'}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer détail RDV */}
      {selectedBooking && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-white">
                Détail RDV
              </h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-gray-400 hover:text-white"
              >✕</button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: 'Numéro', value: selectedBooking.bookingNumber },
                { label: 'Formule', value: selectedBooking.service?.name },
                {
                  label: 'Heure',
                  value: `${formatTime(selectedBooking.bookedAt)} — ${formatTime(selectedBooking.endAt)}`,
                },
                { label: 'Durée', value: `${selectedBooking.service?.durationMin} min` },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-gray-400">{row.label}</span>
                  <span className="font-medium text-white">{row.value}</span>
                </div>
              ))}

              <div className="flex justify-between items-center">
                <span className="text-gray-400">Statut</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${
                  statusColors[selectedBooking.status] ?? ''
                }`}>
                  {statusLabels[selectedBooking.status] ?? selectedBooking.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 transition-colors mt-2"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}