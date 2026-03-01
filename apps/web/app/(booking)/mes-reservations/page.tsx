// .\.\apps\web\app\(booking)\mes-reservations\page.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';

// ─── Types ────────────────────────────────────────────────
interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  bookedAt: string;
  endAt: string;
  totalPrice: number;
  depositPaid: number;
  notes?: string;
  service: {
    name: string;
    durationMin: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDateTime = (isoStr: string) =>
  new Date(isoStr).toLocaleString('fr-SN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    hour:    '2-digit',
    minute:  '2-digit',
  });

const statusConfig: Record<string, {
  label: string;
  variant: 'green' | 'orange' | 'blue' | 'gray' | 'red';
}> = {
  pending:      { label: 'En attente paiement', variant: 'orange' },
  deposit_paid: { label: 'Acompte payé',        variant: 'blue'   },
  confirmed:    { label: 'Confirmé',             variant: 'blue'   },
  in_progress:  { label: 'En cours',             variant: 'blue'   },
  completed:    { label: 'Terminé',              variant: 'green'  },
  cancelled:    { label: 'Annulé',               variant: 'red'    },
  no_show:      { label: 'Non présenté',         variant: 'gray'   },
};

// ─── Composant ────────────────────────────────────────────
export default function MesReservationsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/mes-reservations');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: bookings, isLoading, isError } = useQuery({
    queryKey: ['bookings'],
    queryFn: async () => {
      const { data } = await api.get<Booking[]>('/bookings');
      return data;
    },
    enabled: isAuthenticated,
  });

  // Mutation annulation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.patch(`/bookings/${bookingId}/cancel`, {});
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      const msg = data.refundEligible
        ? `Réservation annulée. Remboursement de ${formatPrice(data.refundAmount)} en cours.`
        : 'Réservation annulée. Annulation < 24h : acompte non remboursé.';
      alert(msg);
    },
    onError: () => {
      alert('Erreur lors de l\'annulation');
    },
    onSettled: () => setCancellingId(null),
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Réservations</h1>
          <p className="text-gray-500 mt-1">Historique de vos rendez-vous</p>
        </div>
        <Link
          href="/services"
          className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nouveau RDV
        </Link>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger vos réservations.
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && bookings?.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">📅</span>
          <p className="text-lg font-medium text-gray-700">
            Aucune réservation pour le moment
          </p>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Réservez votre premier rendez-vous en ligne
          </p>
          <Link
            href="/services"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Voir les formules
          </Link>
        </div>
      )}

      <div className="space-y-4">
        {bookings?.map((booking) => {
          const status = statusConfig[booking.status] ?? {
            label: booking.status,
            variant: 'gray' as const,
          };
          const canCancel = ['pending', 'deposit_paid', 'confirmed'].includes(
            booking.status,
          );

          return (
            <div
              key={booking.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-gray-900 text-lg">
                    {booking.bookingNumber}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {booking.service?.name}
                  </span>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {/* Détails */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Date & heure</p>
                  <p className="font-medium capitalize text-gray-900">
                    {formatDateTime(booking.bookedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Prix total</p>
                  <p className="font-medium text-gray-900">
                    {formatPrice(booking.totalPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Acompte payé</p>
                  <p className={`font-medium ${Number(booking.depositPaid) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {Number(booking.depositPaid) > 0
                      ? formatPrice(Number(booking.depositPaid))
                      : 'Non payé'}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <p className="text-sm text-gray-500 italic">
                  &quot;{booking.notes}&quot;
                </p>
              )}

              {/* Actions */}
              {canCancel && (
                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => {
                      setCancellingId(booking.id);
                      if (confirm('Confirmer l\'annulation de ce rendez-vous ?')) {
                        cancelMutation.mutate(booking.id);
                      } else {
                        setCancellingId(null);
                      }
                    }}
                    disabled={cancellingId === booking.id}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                  >
                    {cancellingId === booking.id ? 'Annulation...' : 'Annuler le RDV'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}