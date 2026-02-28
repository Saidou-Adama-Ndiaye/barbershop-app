'use client';

import { useState, useCallback } from 'react';
import { useCartStore } from '@/lib/store/cart.store';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
interface PackProduct {
  id: string;
  productId: string;
  product: { id: string; name: string; unitPrice: number };
  quantity: number;
  isOptional: boolean;
}

interface PriceBreakdown {
  basePrice: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  breakdown: {
    included: { name: string; unitPrice: number; quantity: number }[];
    added:    { name: string; unitPrice: number; quantity: number }[];
    removed:  { name: string; unitPrice: number }[];
  };
}

interface PackCustomizerProps {
  packId: string;
  packName: string;
  packSlug: string;
  basePrice: number;
  finalPrice: number;
  discountPct: number;
  isCustomizable: boolean;
  packProducts: PackProduct[];
}

// ─── Helper prix ──────────────────────────────────────────
const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

// ─── Composant ────────────────────────────────────────────
export default function PackCustomizer({
  packId,
  packName,
  packSlug,
  finalPrice,
  discountPct,
  isCustomizable,
  packProducts,
}: PackCustomizerProps) {
  const addItem = useCartStore((s) => s.addItem);

  // Produits retirés (optionnels uniquement)
  const [removals, setRemovals] = useState<string[]>([]);
  // Produits ajoutés
  const [additions, setAdditions] = useState<string[]>([]);
  // Prix recalculé
  const [currentPrice, setCurrentPrice] = useState(finalPrice);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // ─── Recalcul prix via API ─────────────────────────────
  const recalculatePrice = useCallback(
    async (newRemovals: string[], newAdditions: string[]) => {
      setIsCalculating(true);
      try {
        const { data } = await api.post<PriceBreakdown>(
          `/packs/${packId}/calculate`,
          { additions: newAdditions, removals: newRemovals },
        );
        setCurrentPrice(data.finalPrice);
        setPriceBreakdown(data);
      } catch (err) {
        console.error('Erreur recalcul prix:', err);
      } finally {
        setIsCalculating(false);
      }
    },
    [packId],
  );

  // ─── Toggle produit optionnel ──────────────────────────
  const toggleRemoval = (productId: string) => {
    const newRemovals = removals.includes(productId)
      ? removals.filter((id) => id !== productId)
      : [...removals, productId];
    setRemovals(newRemovals);
    recalculatePrice(newRemovals, additions);
  };

  // ─── Ajouter au panier ────────────────────────────────
  const handleAddToCart = () => {
    addItem({
      packId,
      packName,
      packSlug,
      quantity: 1,
      unitPrice: currentPrice,
      customizations:
        removals.length > 0 || additions.length > 0
          ? { additions, removals }
          : undefined,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const optionalProducts  = packProducts.filter((pp) => pp.isOptional);
  const mandatoryProducts = packProducts.filter((pp) => !pp.isOptional);

  return (
    <div className="space-y-6">

      {/* Produits obligatoires */}
      {mandatoryProducts.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Produits inclus
          </h3>
          <ul className="space-y-2">
            {mandatoryProducts.map((pp) => (
              <li
                key={pp.id}
                className="flex items-center justify-between py-2 border-b border-gray-100"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</span>
                  <span className="text-gray-800 text-sm">
                    {pp.product.name}
                    {pp.quantity > 1 && (
                      <span className="text-gray-400 ml-1">x{pp.quantity}</span>
                    )}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatPrice(pp.product.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Produits optionnels (toggle) */}
      {isCustomizable && optionalProducts.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Personnaliser le pack
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            Décochez les produits dont vous n&apos;avez pas besoin.
          </p>
          <ul className="space-y-2">
            {optionalProducts.map((pp) => {
              const isRemoved = removals.includes(pp.productId);
              return (
                <li
                  key={pp.id}
                  className={`flex items-center justify-between py-2 border-b border-gray-100 cursor-pointer transition-opacity ${isRemoved ? 'opacity-40' : ''}`}
                  onClick={() => toggleRemoval(pp.productId)}
                >
                  <div className="flex items-center gap-3">
                    {/* Checkbox custom */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isRemoved
                        ? 'border-gray-300 bg-white'
                        : 'border-gray-900 bg-gray-900'
                    }`}>
                      {!isRemoved && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                    <span className={`text-sm ${isRemoved ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {pp.product.name}
                      {pp.quantity > 1 && (
                        <span className="text-gray-400 ml-1">x{pp.quantity}</span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {isRemoved ? (
                      <span className="text-red-400">-{formatPrice(pp.product.unitPrice)}</span>
                    ) : (
                      formatPrice(pp.product.unitPrice)
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Récapitulatif prix */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        {priceBreakdown && (
          <>
            {priceBreakdown.breakdown.removed.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Produits retirés</span>
                <span className="text-red-500">
                  -{formatPrice(
                    priceBreakdown.breakdown.removed.reduce(
                      (sum, p) => sum + p.unitPrice, 0,
                    ),
                  )}
                </span>
              </div>
            )}
            {priceBreakdown.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Réduction pack ({discountPct}%)</span>
                <span className="text-green-600">
                  -{formatPrice(priceBreakdown.discountAmount)}
                </span>
              </div>
            )}
          </>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total</span>
          <div className="flex items-center gap-2">
            {isCalculating && (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            )}
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(currentPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Bouton ajouter au panier */}
      <button
        onClick={handleAddToCart}
        disabled={isCalculating}
        className={`w-full py-3 rounded-xl font-semibold text-base transition-all duration-200 ${
          addedToCart
            ? 'bg-green-600 text-white'
            : 'bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50'
        }`}
      >
        {addedToCart ? '✓ Ajouté au panier !' : 'Ajouter au panier'}
      </button>
    </div>
  );
}