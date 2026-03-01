// .\.\apps\web\app\(shop)\panier\page.tsx
'use client';

import { useCartStore } from '@/lib/store/cart.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useState } from 'react';

const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

export default function PanierPage() {
  const { items, totalAmount, removeItem, updateQty, clear } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  // ─── Passer la commande ──────────────────────────────
  const handleOrder = async () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/panier');
      return;
    }

    setIsOrdering(true);
    setOrderError(null);

    try {
      const payload = {
        items: items.map((item) => ({
          packId: item.packId,
          quantity: item.quantity,
          customizations: item.customizations ?? {},
        })),
      };

      const { data } = await api.post('/orders', payload);
      setOrderSuccess(data.orderNumber);
      clear();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la commande';
      setOrderError(message);
    } finally {
      setIsOrdering(false);
    }
  };

  // ─── Panier vide ─────────────────────────────────────
  if (items.length === 0 && !orderSuccess) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl block mb-4">🛒</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 mb-6">Découvrez nos packs professionnels</p>
        <Link
          href="/packs"
          className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Voir le catalogue
        </Link>
      </div>
    );
  }

  // ─── Commande confirmée ───────────────────────────────
  if (orderSuccess) {
    return (
      <div className="text-center py-20">
        <span className="text-6xl block mb-4">✅</span>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h2>
        <p className="text-gray-500 mb-2">Numéro de commande :</p>
        <p className="text-xl font-bold text-gray-900 mb-6">{orderSuccess}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/commandes"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Voir mes commandes
          </Link>
          <Link
            href="/packs"
            className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Mon Panier</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Liste des items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.packId}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Icône pack */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✂️</span>
              </div>

              {/* Infos */}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{item.packName}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatPrice(item.unitPrice)} / unité
                </p>
                {item.customizations && (
                  <p className="text-xs text-blue-600 mt-1">Pack personnalisé</p>
                )}
              </div>

              {/* Quantité */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateQty(item.packId, item.quantity - 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-medium transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center font-semibold">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.packId, item.quantity + 1)}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 font-medium transition-colors"
                >
                  +
                </button>
              </div>

              {/* Sous-total */}
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  {formatPrice(item.unitPrice * item.quantity)}
                </p>
                <button
                  onClick={() => removeItem(item.packId)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors mt-1"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Récapitulatif commande */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 sticky top-24">
            <h2 className="font-bold text-gray-900 text-lg">Récapitulatif</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total ({items.reduce((s, i) => s + i.quantity, 0)} article{items.length > 1 ? 's' : ''})</span>
                <span>{formatPrice(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span className="text-green-600">À définir</span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(totalAmount)}
              </span>
            </div>

            {orderError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {orderError}
              </div>
            )}

            <button
              onClick={handleOrder}
              disabled={isOrdering}
              className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isOrdering ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Traitement...
                </>
              ) : (
                'Passer la commande'
              )}
            </button>

            <Link
              href="/packs"
              className="block text-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              ← Continuer mes achats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}