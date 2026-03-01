'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Product {
  id:          string;
  name:        string;
  sku:         string;
  stockQty:    number;
  isLowStock:  boolean;
  isCritical:  boolean;
}

interface StockResponse {
  products:  Product[];
  lowCount:  number;
  critCount: number;
}

interface EditState {
  productId: string;
  name:      string;
  current:   number;
}

export default function AdminStockPage() {
  const queryClient = useQueryClient();
  const [editState, setEditState]   = useState<EditState | null>(null);
  const [newQty,    setNewQty]      = useState<number>(0);
  const [reason,    setReason]      = useState('');
  const [search,    setSearch]      = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-stock'],
    queryFn:  async () => {
      const { data } = await api.get<StockResponse>('/admin/products/stock');
      return data;
    },
  });

  const stockMutation = useMutation({
    mutationFn: async ({ productId, quantity, reason }: {
      productId: string; quantity: number; reason: string;
    }) => {
      await api.patch(`/admin/products/${productId}/stock`, { quantity, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stock'] });
      setEditState(null);
      setNewQty(0);
      setReason('');
    },
  });

  const openEdit = (product: Product) => {
    setEditState({
      productId: product.id,
      name:      product.name,
      current:   product.stockQty,
    });
    setNewQty(product.stockQty);
    setReason('');
  };

  const filtered = data?.products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const stockBadge = (product: Product) => {
    if (product.isCritical) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-900/50 text-red-300 border border-red-700">
          ⚠️ Critique ({product.stockQty})
        </span>
      );
    }
    if (product.isLowStock) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-900/50 text-amber-300 border border-amber-700">
          ⚡ Faible ({product.stockQty})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-900/50 text-green-300 border border-green-700">
        ✓ OK ({product.stockQty})
      </span>
    );
  };

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestion du Stock</h1>
          <p className="text-gray-400 mt-1">
            {data?.critCount ?? 0} critique(s) •{' '}
            {data?.lowCount ?? 0} faible(s)
          </p>
        </div>
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 w-56"
        />
      </div>

      {/* Alertes */}
      {(data?.critCount ?? 0) > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
          🚨 <strong>{data?.critCount} produit(s)</strong> en stock critique (moins de 5 unités)
        </div>
      )}

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">Produit</th>
                <th className="text-left px-6 py-4 text-gray-400 text-sm font-medium">SKU</th>
                <th className="text-center px-6 py-4 text-gray-400 text-sm font-medium">Stock</th>
                <th className="text-right px-6 py-4 text-gray-400 text-sm font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((product) => (
                <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{product.name}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {product.sku ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {stockBadge(product)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEdit(product)}
                      className="text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      ✏️ Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucun produit trouvé
            </div>
          )}
        </div>
      )}

      {/* Modal édition stock */}
      {editState && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="text-lg font-bold text-white">
              Modifier le stock — {editState.name}
            </h3>

            <div className="bg-gray-800 rounded-xl p-4 text-sm">
              <span className="text-gray-400">Stock actuel : </span>
              <span className="font-bold text-white">{editState.current} unités</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Nouvelle quantité
                </label>
                <input
                  type="number" min="0" value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500"
                />
                {newQty !== editState.current && (
                  <p className={`text-xs mt-1 ${
                    newQty > editState.current ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {newQty > editState.current ? '+' : ''}{newQty - editState.current} unités
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Raison de la modification
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500"
                >
                  <option value="">Sélectionner une raison</option>
                  <option value="Réapprovisionnement fournisseur">Réapprovisionnement fournisseur</option>
                  <option value="Correction d'inventaire">Correction d&apos;inventaire</option>
                  <option value="Retour client">Retour client</option>
                  <option value="Perte / casse">Perte / casse</option>
                  <option value="Ajustement manuel">Ajustement manuel</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditState(null)}
                className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => stockMutation.mutate({
                  productId: editState.productId,
                  quantity:  newQty,
                  reason:    reason || 'Ajustement manuel',
                })}
                disabled={stockMutation.isPending || newQty === editState.current}
                className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                {stockMutation.isPending ? 'Mise à jour...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}