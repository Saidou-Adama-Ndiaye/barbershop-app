// .\.\apps\web\app\(shop)\commandes\page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────
interface OrderItem {
  id: string;
  packSnapshot: { name: string; finalPrice: number };
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  items: OrderItem[];
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr: string): string =>
  new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));

const statusConfig: Record<string, { label: string; variant: 'green' | 'orange' | 'blue' | 'gray' | 'red' }> = {
  pending:    { label: 'En attente',   variant: 'orange' },
  confirmed:  { label: 'Confirmée',    variant: 'blue'   },
  processing: { label: 'En cours',     variant: 'blue'   },
  shipped:    { label: 'Expédiée',     variant: 'blue'   },
  delivered:  { label: 'Livrée',       variant: 'green'  },
  cancelled:  { label: 'Annulée',      variant: 'red'    },
  refunded:   { label: 'Remboursée',   variant: 'gray'   },
};

// ─── Composant ────────────────────────────────────────────
export default function CommandesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  // Redirection si non connecté
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/commandes');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await api.get<Order[]>('/orders');
      return data;
    },
    enabled: isAuthenticated,
  });

  // Loading auth
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
        <p className="text-gray-500 mt-1">Historique de toutes vos commandes</p>
      </div>

      {/* Erreur */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger vos commandes. Réessayez plus tard.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Liste vide */}
      {!isLoading && orders?.length === 0 && (
        <div className="text-center py-16">
          <span className="text-5xl block mb-4">📋</span>
          <p className="text-lg font-medium text-gray-700">Aucune commande pour le moment</p>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            Vos prochaines commandes apparaîtront ici
          </p>
          <Link
            href="/packs"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Voir le catalogue
          </Link>
        </div>
      )}

      {/* Liste des commandes */}
      <div className="space-y-4">
        {orders?.map((order) => {
          const status = statusConfig[order.status] ?? { label: order.status, variant: 'gray' as const };
          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4"
            >
              {/* Header commande */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-gray-900 text-lg">
                    {order.orderNumber}
                  </span>
                  <span className="text-gray-400 text-sm ml-3">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              {/* Items */}
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.packSnapshot?.name ?? 'Pack'}
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                    </span>
                    <span className="text-gray-900 font-medium">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">Total commande</span>
                <span className="font-bold text-gray-900 text-lg">
                  {formatPrice(order.totalAmount)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}