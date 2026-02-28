'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth.store';

// ─── Types ────────────────────────────────────────────────
interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface AvailabilityResult {
  date: string;
  staffId: string;
  slots: TimeSlot[];
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const formatTime = (isoString: string) =>
  new Date(isoString).toLocaleTimeString('fr-SN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-SN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// Générer les 14 prochains jours
const getNextDays = (count: number): string[] => {
  const days: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

// ─── Composant ────────────────────────────────────────────
export default function CalendrierPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const { isAuthenticated } = useAuthStore();

  const serviceId   = searchParams.get('serviceId')   ?? '';
  const serviceName = searchParams.get('serviceName') ?? 'Formule';
  const price       = Number(searchParams.get('price') ?? 0);
  const duration    = Number(searchParams.get('duration') ?? 30);

  const [selectedDate, setSelectedDate]   = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [selectedSlot, setSelectedSlot]   = useState<TimeSlot | null>(null);
  const [isBooking, setIsBooking]         = useState(false);
  const [bookingError, setBookingError]   = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<{
    bookingNumber: string;
    redirectUrl: string;
    depositAmount: number;
  } | null>(null);

  const nextDays = getNextDays(14);

  // Charger les coiffeurs (role=coiffeur_professionnel ou admin)
  const { data: staffList } = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      // On utilise le compte admin seed comme coiffeur disponible
      const { data } = await api.get<StaffMember[]>('/users/staff');
      return data;
    },
    // Si endpoint inexistant, fallback sur l'admin seed
    retry: false,
  });

  // Charger les créneaux disponibles
  const { data: availability, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', selectedStaff, selectedDate, serviceId],
    queryFn: async () => {
      const { data } = await api.get<AvailabilityResult>('/bookings/availability', {
        params: { staffId: selectedStaff, date: selectedDate, serviceId },
      });
      return data;
    },
    enabled: !!selectedStaff && !!selectedDate && !!serviceId,
  });

  // Réinitialiser le créneau si date ou staff change
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedStaff]);

  // ─── Créer la réservation ──────────────────────────────
  const handleBooking = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/calendrier?serviceId=${serviceId}`);
      return;
    }
    if (!selectedSlot || !selectedStaff) return;

    setIsBooking(true);
    setBookingError(null);

    try {
      const { data } = await api.post('/bookings', {
        serviceId,
        staffId:  selectedStaff,
        bookedAt: selectedSlot.start,
      });

      setBookingResult({
        bookingNumber: data.booking.bookingNumber,
        redirectUrl:   data.payment.redirectUrl,
        depositAmount: data.depositAmount,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setBookingError(
        axiosError.response?.data?.message ?? 'Erreur lors de la réservation',
      );
    } finally {
      setIsBooking(false);
    }
  };

  const depositAmount = Math.round((price * 30) / 100);

  // ─── Réservation confirmée ────────────────────────────
  if (bookingResult) {
    return (
      <><div className="max-w-lg mx-auto text-center py-12 space-y-6">
            <span className="text-6xl block">✅</span>
            <h2 className="text-2xl font-bold text-gray-900">Réservation créée !</h2>
            <div className="bg-gray-50 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-500">Numéro RDV</span>
                    <span className="font-bold">{bookingResult.bookingNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Acompte à payer</span>
                    <span className="font-bold text-amber-600">
                        {formatPrice(bookingResult.depositAmount)}
                    </span>
                </div>
            </div>
            <p className="text-gray-600 text-sm">
                Cliquez sur &quot;Payer l&apos;acompte&quot; pour confirmer votre réservation via Wave.
            </p>

            <a href={bookingResult.redirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
            💳 Payer l&apos;acompte ({formatPrice(bookingResult.depositAmount)})
        </a><button
            onClick={() => router.push('/mes-reservations')}
            className="block w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
                Voir mes réservations
            </button>
      </div> 
      </>
    );
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1"
        >
          ← Retour aux formules
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Choisir un créneau</h1>
        <div className="flex items-center gap-3 mt-2">
          <span className="bg-gray-900 text-white text-sm px-3 py-1 rounded-full font-medium">
            {serviceName}
          </span>
          <span className="text-gray-500 text-sm">{formatPrice(price)}</span>
          <span className="text-gray-400 text-sm">•</span>
          <span className="text-gray-500 text-sm">{duration} min</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Colonne gauche : Date + Coiffeur */}
        <div className="lg:col-span-1 space-y-6">

          {/* Sélection coiffeur */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Coiffeur</h2>
            <div className="space-y-2">
              {/* Coiffeur par défaut (admin seed) */}
              {[{ id: 'admin-seed', name: 'Moussa Diallo (Admin)' }].map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedStaff === staff.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium">{staff.name}</span>
                </button>
              ))}

              {/* Coiffeurs depuis API si disponibles */}
              {staffList?.map((staff) => (
                <button
                  key={staff.id}
                  onClick={() => setSelectedStaff(staff.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    selectedStaff === staff.id
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <span className="font-medium">
                    {staff.firstName} {staff.lastName}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection date */}
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Date</h2>
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {nextDays.map((day) => {
                const d = new Date(day);
                const isWeekend = d.getDay() === 0; // Dimanche fermé
                return (
                  <button
                    key={day}
                    onClick={() => !isWeekend && setSelectedDate(day)}
                    disabled={isWeekend}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ${
                      selectedDate === day
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : isWeekend
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span className="capitalize">
                      {d.toLocaleDateString('fr-SN', {
                        weekday: 'short',
                        day:     'numeric',
                        month:   'short',
                      })}
                    </span>
                    {isWeekend && (
                      <span className="text-xs ml-2 text-gray-300">Fermé</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Colonne droite : Créneaux */}
        <div className="lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-3">
            Créneaux disponibles
            {selectedDate && (
              <span className="text-gray-500 font-normal ml-2 text-sm">
                — {formatDate(selectedDate)}
              </span>
            )}
          </h2>

          {/* Message si pas de sélection */}
          {(!selectedStaff || !selectedDate) && (
            <div className="text-center py-16 text-gray-400">
              <span className="text-4xl block mb-3">📅</span>
              <p>Sélectionnez un coiffeur et une date</p>
            </div>
          )}

          {/* Loading créneaux */}
          {slotsLoading && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {/* Grille créneaux */}
          {availability && !slotsLoading && (
            <>
              {availability.slots.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <span className="text-4xl block mb-3">😔</span>
                  <p>Aucun créneau disponible ce jour</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availability.slots.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => slot.available && setSelectedSlot(slot)}
                      disabled={!slot.available}
                      className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                        selectedSlot?.start === slot.start
                          ? 'bg-gray-900 text-white'
                          : slot.available
                          ? 'bg-gray-50 border border-gray-200 hover:border-gray-900 hover:bg-gray-100'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Récapitulatif + Bouton réserver */}
          {selectedSlot && (
            <div className="mt-6 bg-gray-50 rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">Récapitulatif</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Formule</span>
                  <span className="font-medium">{serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium capitalize">
                    {formatDate(selectedDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Heure</span>
                  <span className="font-medium">
                    {formatTime(selectedSlot.start)} — {formatTime(selectedSlot.end)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prix total</span>
                  <span className="font-medium">{formatPrice(price)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold">Acompte à payer</span>
                  <span className="font-bold text-amber-600">
                    {formatPrice(depositAmount)}
                  </span>
                </div>
              </div>

              {bookingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {bookingError}
                </div>
              )}

              <button
                onClick={handleBooking}
                disabled={isBooking}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBooking ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Réservation en cours...
                  </>
                ) : (
                  `Réserver & payer ${formatPrice(depositAmount)}`
                )}
              </button>

              {!isAuthenticated && (
                <p className="text-center text-xs text-gray-500">
                  Vous devrez vous connecter pour confirmer la réservation
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}