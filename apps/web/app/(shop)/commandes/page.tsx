// .\.\apps\web\app\(shop)\commandes\page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────
interface OrderItem {
  id:           string;
  packSnapshot: {
    name:      string;
    finalPrice: number;
    products?: { name: string; quantity: number }[];
  };
  quantity:     number;
  unitPrice:    number;
}

type OrderStatus =
  | 'pending' | 'confirmed' | 'processing'
  | 'shipped'  | 'delivered' | 'cancelled' | 'refunded';

interface Order {
  id:             string;
  orderNumber:    string;
  status:         OrderStatus;
  totalAmount:    number;
  discountAmount: number;
  couponCode:     string | null;
  createdAt:      string;
  items:          OrderItem[];
}

// ─── Constantes ───────────────────────────────────────────
const STATUS_STEPS: OrderStatus[] = [
  'pending', 'confirmed', 'processing', 'shipped', 'delivered',
];

const STATUS_CONFIG: Record<OrderStatus, {
  label: string; icon: string; color: string; description: string;
}> = {
  pending:    { label: 'En attente',       icon: '🕐', color: 'text-amber-600',  description: 'Votre commande est en attente de confirmation.' },
  confirmed:  { label: 'Confirmée',        icon: '✅', color: 'text-blue-600',   description: 'Votre commande a été confirmée et est en cours de préparation.' },
  processing: { label: 'En préparation',   icon: '⚙️', color: 'text-purple-600', description: 'Votre commande est en cours de préparation.' },
  shipped:    { label: 'Expédiée',         icon: '🚚', color: 'text-indigo-600', description: 'Votre commande est en route !' },
  delivered:  { label: 'Livrée',           icon: '🎉', color: 'text-green-600',  description: 'Votre commande a été livrée. Merci pour votre confiance !' },
  cancelled:  { label: 'Annulée',          icon: '❌', color: 'text-red-600',    description: 'Cette commande a été annulée.' },
  refunded:   { label: 'Remboursée',       icon: '↩️', color: 'text-gray-500',   description: 'Cette commande a été remboursée.' },
};

// ─── Helpers ─────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date(d));

// ─── Barre de progression statut ─────────────────────────
function StatusProgress({ status }: { status: OrderStatus }) {
  const isCancelled = status === 'cancelled' || status === 'refunded';
  const currentStep = STATUS_STEPS.indexOf(status);

  if (isCancelled) {
    const cfg = STATUS_CONFIG[status];
    return (
      <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100`}>
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
          <p className="text-sm text-gray-500">{cfg.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Barre de progression */}
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, i) => {
          const done    = i <= currentStep;
          const current = i === currentStep;
          const cfg     = STATUS_CONFIG[step];
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              {/* Cercle étape */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm
                  transition-all duration-300
                  ${done
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-400'
                  }
                  ${current ? 'ring-4 ring-gray-900/20 scale-110' : ''}
                `}>
                  {done ? (current ? cfg.icon : '✓') : <span className="w-2 h-2 bg-gray-300 rounded-full block" />}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  done ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {cfg.label}
                </span>
              </div>

              {/* Ligne connecteur */}
              {i < STATUS_STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full transition-all duration-500 ${
                  i < currentStep ? 'bg-gray-900' : 'bg-gray-100'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Description statut actuel */}
      <div className={`flex items-start gap-2 p-3 rounded-xl bg-gray-50`}>
        <span className="text-base">{STATUS_CONFIG[status]?.icon}</span>
        <p className="text-sm text-gray-600">{STATUS_CONFIG[status]?.description}</p>
      </div>
    </div>
  );
}

// ─── Carte commande expandable ────────────────────────────
function OrderCard({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-shadow hover:shadow-md">

      {/* Header cliquable */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-5 text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className={`
              w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0
              ${order.status === 'delivered' ? 'bg-green-50' :
                order.status === 'cancelled' ? 'bg-red-50' : 'bg-gray-50'}
            `}>
              {cfg.icon}
            </div>
            <div>
              <p className="font-bold text-gray-900">{order.orderNumber}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {fmtDate(order.createdAt)} · {order.items.length} article{order.items.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="font-bold text-gray-900">{fmt(Number(order.totalAmount))}</p>
              <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
            </div>
            <span className={`text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>
              ›
            </span>
          </div>
        </div>
      </button>

      {/* Contenu expandé */}
      {expanded && (
        <div className="border-t border-gray-100 p-5 space-y-5">

          {/* Progression */}
          <StatusProgress status={order.status} />

          {/* Produits */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">Produits commandés</h4>
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span>✂️</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {item.packSnapshot?.name ?? 'Pack'}
                      <span className="text-gray-400 ml-1 font-normal">×{item.quantity}</span>
                    </p>
                    {item.packSnapshot?.products && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.packSnapshot.products.map((p, i) => (
                          <span key={i} className="text-xs bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {p.name}{p.quantity > 1 && ` ×${p.quantity}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                  {fmt(item.unitPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Récap prix */}
          <div className="rounded-xl border border-gray-100 overflow-hidden text-sm">
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between px-4 py-2.5 bg-green-50 text-green-700">
                <span className="flex items-center gap-1">
                  🎉 Code{' '}
                  <span className="font-mono bg-green-100 px-1.5 rounded text-xs">
                    {order.couponCode}
                  </span>
                </span>
                <span className="font-semibold">-{fmt(Number(order.discountAmount))}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 font-bold text-gray-900">
              <span>Total payé</span>
              <span>{fmt(Number(order.totalAmount))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function CommandesPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/commandes');
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: orders, isLoading, isError } = useQuery({
    queryKey: ['orders'],
    queryFn:  async () => {
      const { data } = await api.get<Order[]>('/orders');
      return data;
    },
    enabled:      isAuthenticated,
    refetchInterval: 30_000, // ✅ refresh auto toutes les 30s
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // ─── Grouper par statut actif vs terminé ─────────────
  const active   = orders?.filter((o) => !['delivered', 'cancelled', 'refunded'].includes(o.status)) ?? [];
  const archived = orders?.filter((o) =>  ['delivered', 'cancelled', 'refunded'].includes(o.status)) ?? [];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mes Commandes</h1>
        <p className="text-gray-500 mt-1">
          {orders?.length ?? 0} commande{(orders?.length ?? 0) > 1 ? 's' : ''} au total
        </p>
      </div>

      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger vos commandes. Réessayez plus tard.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Aucune commande */}
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

      {/* Commandes en cours */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse inline-block" />
            En cours ({active.length})
          </h2>
          {active.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}

      {/* Commandes terminées / archivées */}
      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-500">
            Historique ({archived.length})
          </h2>
          {archived.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}