// apps/web/app/admin/commandes/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
interface OrderItem {
  id:           string;
  packSnapshot: { name: string; finalPrice: number; products?: { name: string; quantity: number }[] };
  quantity:     number;
  unitPrice:    number;
  customizations?: Record<string, unknown>;
}

interface Order {
  id:             string;
  orderNumber:    string;
  status:         OrderStatus;
  totalAmount:    number;
  discountAmount: number;
  couponCode:     string | null;
  currency:       string;
  createdAt:      string;
  updatedAt:      string;
  userId:         string;
  notes:          string | null;
  items:          OrderItem[];
}

type OrderStatus =
  | 'pending' | 'confirmed' | 'processing'
  | 'shipped'  | 'delivered' | 'cancelled' | 'refunded';

// ─── Constantes ───────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending:    { label: 'En attente',  color: 'text-amber-700',  bg: 'bg-amber-100'  },
  confirmed:  { label: 'Confirmée',   color: 'text-blue-700',   bg: 'bg-blue-100'   },
  processing: { label: 'En cours',    color: 'text-purple-700', bg: 'bg-purple-100' },
  shipped:    { label: 'Expédiée',    color: 'text-indigo-700', bg: 'bg-indigo-100' },
  delivered:  { label: 'Livrée',      color: 'text-green-700',  bg: 'bg-green-100'  },
  cancelled:  { label: 'Annulée',     color: 'text-red-700',    bg: 'bg-red-100'    },
  refunded:   { label: 'Remboursée',  color: 'text-gray-600',   bg: 'bg-gray-100'   },
};

// Transitions autorisées (miroir du backend)
const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped:    ['delivered'],
  delivered:  ['refunded'],
  cancelled:  [],
  refunded:   [],
};

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d));

// ─── Badge statut ─────────────────────────────────────────
function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-100' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Modal détail commande ────────────────────────────────
function OrderDetailModal({
  order,
  onClose,
  onStatusChange,
}: {
  order:          Order;
  onClose:        () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const transitions = STATUS_TRANSITIONS[order.status] ?? [];

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await onStatusChange(order.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">
                  {order.orderNumber}
                </h2>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-sm text-gray-500">{fmtDate(order.createdAt)}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body scrollable */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">

            {/* ── Changer le statut ─────────────────── */}
            {transitions.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Changer le statut
                </h3>
                <div className="flex flex-wrap gap-2">
                  {transitions.map((nextStatus) => {
                    const cfg = STATUS_CONFIG[nextStatus];
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => handleStatusChange(nextStatus)}
                        disabled={isUpdating}
                        className={`
                          px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                          ${cfg.bg} ${cfg.color} border-transparent
                          hover:border-current hover:scale-[1.02]
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {isUpdating ? '...' : `→ ${cfg.label}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Produits commandés ────────────────── */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Produits ({order.items.length})
              </h3>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-2xl gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">✂️</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {item.packSnapshot?.name ?? 'Pack'}
                          <span className="text-gray-400 ml-2 font-normal">
                            ×{item.quantity}
                          </span>
                        </p>
                        {/* Produits du snapshot */}
                        {item.packSnapshot?.products && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.packSnapshot.products.map((p, i) => (
                              <span
                                key={i}
                                className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full"
                              >
                                {p.name}
                                {p.quantity > 1 && ` ×${p.quantity}`}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Personnalisations */}
                        {item.customizations &&
                          Object.keys(item.customizations).length > 0 && (
                            <p className="text-xs text-blue-600 mt-1">
                              Pack personnalisé
                            </p>
                          )}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm flex-shrink-0">
                      {fmt(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Récapitulatif prix ────────────────── */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>
                    {fmt(Number(order.totalAmount) + Number(order.discountAmount))}
                  </span>
                </div>
                {Number(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      🎉 Code{' '}
                      <span className="font-mono bg-green-100 px-1.5 rounded">
                        {order.couponCode}
                      </span>
                    </span>
                    <span>-{fmt(Number(order.discountAmount))}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center px-4 py-4">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {fmt(Number(order.totalAmount))}
                </span>
              </div>
            </div>

            {/* ── Notes ────────────────────────────── */}
            {order.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-1">Note client</p>
                <p className="text-sm text-amber-700">{order.notes}</p>
              </div>
            )}

            {/* ── Infos techniques ─────────────────── */}
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div>
                <p className="font-medium text-gray-500 mb-0.5">ID commande</p>
                <p className="font-mono">{order.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 mb-0.5">Client ID</p>
                <p className="font-mono">{order.userId.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 mb-0.5">Créée le</p>
                <p>{fmtDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="font-medium text-gray-500 mb-0.5">Mise à jour</p>
                <p>{fmtDate(order.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminCommandesPage() {
  const queryClient                         = useQueryClient();
  const [selectedOrder, setSelectedOrder]   = useState<Order | null>(null);
  const [filterStatus, setFilterStatus]     = useState<OrderStatus | 'all'>('all');
  const [search, setSearch]                 = useState('');

  // ─── Fetch toutes les commandes ──────────────────────
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn:  async () => {
      const { data } = await api.get<Order[]>('/orders');
      return data;
    },
  });

  // ─── Mutation changement statut ──────────────────────
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { data } = await api.patch<Order>(`/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: (updatedOrder) => {
      // Mettre à jour le cache optimistiquement
      queryClient.setQueryData<Order[]>(['admin-orders'], (old) =>
        old?.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)) ?? [],
      );
      // Mettre à jour la commande sélectionnée
      setSelectedOrder(updatedOrder);
    },
  });

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await statusMutation.mutateAsync({ orderId, status });
  };

  // ─── Filtres ─────────────────────────────────────────
  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch = search.trim() === '' ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ─── Compteurs par statut ─────────────────────────────
  const counts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Commandes</h1>
          <p className="text-gray-400 mt-1">
            {orders.length} commande{orders.length > 1 ? 's' : ''} au total
          </p>
        </div>
      </div>

      {/* ── Filtres statut ─────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            filterStatus === 'all'
              ? 'bg-white text-gray-900'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Toutes ({orders.length})
        </button>
        {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-white text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {STATUS_CONFIG[s].label}
            {counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {/* ── Barre de recherche ─────────────────────────── */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par numéro de commande..."
          className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500"
        />
      </div>

      {/* ── Liste commandes ────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune commande trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => (
            <button
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="w-full bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-2xl p-4 text-left transition-all duration-150 hover:bg-gray-800"
            >
              <div className="flex items-center justify-between gap-4">

                {/* Gauche : numéro + date */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                    🛒
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm">
                      {order.orderNumber}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {fmtDate(order.createdAt)} ·{' '}
                      {(order.items ?? []).length} article{(order.items ?? []).length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Centre : produits */}
                <div className="hidden md:flex flex-wrap gap-1 flex-1 justify-center">
                  {(order.items ?? []).slice(0, 2).map((item) => (
                    <span
                      key={item.id}
                      className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-full"
                    >
                      {item.packSnapshot?.name ?? 'Pack'}
                    </span>
                  ))}
                  {(order.items ?? []).length > 2 && (
                    <span className="text-xs text-gray-600">
                      +{(order.items ?? []).length - 2}
                    </span>
                  )}
                </div>

                {/* Droite : statut + montant */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={order.status} />
                  <span className="font-bold text-white text-sm">
                    {fmt(Number(order.totalAmount))}
                  </span>
                  <span className="text-gray-600 text-xs">›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal détail */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}