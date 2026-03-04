// .\.\apps\web\components\shop\PackCustomizer.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/lib/store/cart.store';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
interface PackProduct {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    unitPrice: number;
    imageUrls?: string[];
  };
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

// ─── Helpers ─────────────────────────────────────────────
const fmt = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

// ─── Composant image produit avec fallback ────────────────
function ProductImage({
  imageUrls,
  name,
  size = 48,
}: {
  imageUrls?: string[];
  name: string;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const url = imageUrls?.[0];

  if (!url || imgError) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-xl bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center flex-shrink-0"
      >
        <span className="text-lg">✂️</span>
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="relative rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"
    >
      <Image
        src={url}
        alt={name}
        fill
        className="object-cover"
        onError={() => setImgError(true)}
        sizes={`${size}px`}
      />
    </div>
  );
}

// ─── Modal Customizer ─────────────────────────────────────
function CustomizerModal({
  packId,
  packName,
  packSlug,
  finalPrice,
  discountPct,
  isCustomizable,
  packProducts,
  onClose,
}: PackCustomizerProps & { onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem);

  const [removals, setRemovals]           = useState<string[]>([]);
  const [currentPrice, setCurrentPrice]   = useState(finalPrice);
  const [breakdown, setBreakdown]         = useState<PriceBreakdown | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [addedToCart, setAddedToCart]     = useState(false);
  const [visible, setVisible]             = useState(false);

  // Animation d'entrée
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Bloquer le scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Fermeture avec animation
  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Fermer avec Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleClose]);

  // ─── Recalcul prix ──────────────────────────────────
  const recalculate = useCallback(
    async (newRemovals: string[]) => {
      setIsCalculating(true);
      try {
        const { data } = await api.post<PriceBreakdown>(
          `/packs/${packId}/calculate`,
          { additions: [], removals: newRemovals },
        );
        setCurrentPrice(data.finalPrice);
        setBreakdown(data);
      } catch {
        // silencieux
      } finally {
        setIsCalculating(false);
      }
    },
    [packId],
  );

  // ─── Toggle produit optionnel ────────────────────────
  const toggleRemoval = (productId: string) => {
    const next = removals.includes(productId)
      ? removals.filter((id) => id !== productId)
      : [...removals, productId];
    setRemovals(next);
    recalculate(next);
  };

  // ─── Ajouter au panier ───────────────────────────────
  const handleAddToCart = () => {
    addItem({
      packId,
      packName,
      packSlug,
      quantity:       1,
      unitPrice:      currentPrice,
      customizations: removals.length > 0 ? { additions: [], removals } : undefined,
    });
    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      handleClose();
    }, 1200);
  };

  const mandatory = packProducts.filter((pp) => !pp.isOptional);
  const optional  = packProducts.filter((pp) => pp.isOptional);

  const removedSavings = breakdown?.breakdown.removed.reduce(
    (sum, p) => sum + p.unitPrice, 0,
  ) ?? 0;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          opacity: visible ? 1 : 0,
        }}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="relative w-full sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl overflow-hidden"
          style={{
            maxHeight: '92vh',
            pointerEvents: 'auto',
            transform: visible
              ? 'translateY(0) scale(1)'
              : 'translateY(40px) scale(0.97)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.35s cubic-bezier(.22,.68,0,1.2), opacity 0.3s ease',
          }}
        >
          {/* ── Header ──────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-0.5">
                Personnalisation
              </p>
              <h2 className="text-xl font-bold text-gray-900 leading-tight">
                {packName}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-900 transition-all duration-150 flex-shrink-0"
            >
              ✕
            </button>
          </div>

          {/* ── Body scrollable ──────────────────────── */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 160px)' }}>
            <div className="p-6 space-y-6">

              {/* ── Produits obligatoires ─────────────── */}
              {mandatory.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-900 inline-block" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                      Inclus dans le pack
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {mandatory.map((pp) => (
                      <div
                        key={pp.id}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100"
                      >
                        <ProductImage
                          imageUrls={pp.product.imageUrls}
                          name={pp.product.name}
                          size={44}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {pp.product.name}
                          </p>
                          {pp.quantity > 1 && (
                            <p className="text-xs text-gray-400">
                              Quantité : {pp.quantity}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold text-gray-700">
                            {fmt(pp.product.unitPrice * pp.quantity)}
                          </span>
                          <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 text-xs">✓</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Produits optionnels ───────────────── */}
              {isCustomizable && optional.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Options — décochez pour retirer
                      </h3>
                    </div>
                    {removals.length > 0 && (
                      <button
                        onClick={() => { setRemovals([]); recalculate([]); }}
                        className="text-xs text-gray-400 hover:text-gray-900 underline transition-colors"
                      >
                        Tout réactiver
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {optional.map((pp) => {
                      const isRemoved = removals.includes(pp.productId);
                      return (
                        <button
                          key={pp.id}
                          type="button"
                          onClick={() => toggleRemoval(pp.productId)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-2xl border
                            text-left transition-all duration-200 group
                            ${isRemoved
                              ? 'bg-white border-gray-100 opacity-50'
                              : 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm'
                            }
                          `}
                        >
                          {/* Image avec overlay barré si retiré */}
                          <div className="relative flex-shrink-0">
                            <ProductImage
                              imageUrls={pp.product.imageUrls}
                              name={pp.product.name}
                              size={44}
                            />
                            {isRemoved && (
                              <div className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center">
                                <span className="text-red-400 text-lg font-bold">✕</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate transition-colors ${
                              isRemoved ? 'text-gray-400 line-through' : 'text-gray-900'
                            }`}>
                              {pp.product.name}
                            </p>
                            {pp.quantity > 1 && (
                              <p className="text-xs text-gray-400">
                                Quantité : {pp.quantity}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-sm font-semibold transition-colors ${
                              isRemoved ? 'text-red-400' : 'text-gray-700'
                            }`}>
                              {isRemoved ? `-${fmt(pp.product.unitPrice)}` : fmt(pp.product.unitPrice * pp.quantity)}
                            </span>

                            {/* Checkbox custom */}
                            <div className={`
                              w-5 h-5 rounded-md border-2 flex items-center justify-center
                              transition-all duration-200 flex-shrink-0
                              ${isRemoved
                                ? 'border-gray-300 bg-white'
                                : 'border-gray-900 bg-gray-900'
                              }
                            `}>
                              {!isRemoved && (
                                <span className="text-white text-xs leading-none">✓</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Récapitulatif prix ────────────────── */}
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <div className="bg-gray-50 px-4 py-3 space-y-2">

                  {/* Ligne réduction pack */}
                  {discountPct > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Réduction pack ({discountPct}%)
                      </span>
                      <span className="text-emerald-600 font-medium">
                        -{fmt((breakdown?.discountAmount) ?? 0)}
                      </span>
                    </div>
                  )}

                  {/* Ligne produits retirés */}
                  {removedSavings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        Produits retirés ({removals.length})
                      </span>
                      <span className="text-red-500 font-medium">
                        -{fmt(removedSavings)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="bg-white px-4 py-4 flex items-center justify-between">
                  <span className="font-bold text-gray-900 text-base">
                    Total
                  </span>
                  <div className="flex items-center gap-3">
                    {isCalculating && (
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                    )}
                    <span className="text-2xl font-bold text-gray-900 tabular-nums">
                      {fmt(currentPrice)}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ── Footer sticky ────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 bg-white">
            <button
              onClick={handleAddToCart}
              disabled={isCalculating}
              className={`
                w-full py-3.5 rounded-2xl font-semibold text-base
                transition-all duration-300 flex items-center justify-center gap-2
                ${addedToCart
                  ? 'bg-emerald-500 text-white scale-[0.98]'
                  : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50'
                }
              `}
            >
              {addedToCart ? (
                <>
                  <span className="text-lg">✓</span> Ajouté au panier !
                </>
              ) : (
                <>
                  <span className="text-lg">🛒</span>
                  Ajouter au panier — {fmt(currentPrice)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Composant exporté (bouton + modal) ───────────────────
export default function PackCustomizer(props: PackCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* ── Aperçu produits inline (remplace l'ancien inline) ── */}
      <div className="space-y-4">

        {/* Liste produits compact */}
        <div className="space-y-2">
          {props.packProducts.slice(0, 4).map((pp) => (
            <div
              key={pp.id}
              className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <ProductImage
                imageUrls={pp.product.imageUrls}
                name={pp.product.name}
                size={36}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-800 font-medium truncate block">
                  {pp.product.name}
                  {pp.quantity > 1 && (
                    <span className="text-gray-400 ml-1 font-normal">
                      ×{pp.quantity}
                    </span>
                  )}
                </span>
                {pp.isOptional && (
                  <span className="text-xs text-amber-600 font-medium">
                    Optionnel
                  </span>
                )}
              </div>
              <span className="text-sm text-gray-500 flex-shrink-0">
                {fmt(pp.product.unitPrice * pp.quantity)}
              </span>
            </div>
          ))}

          {props.packProducts.length > 4 && (
            <p className="text-xs text-gray-400 text-center py-1">
              +{props.packProducts.length - 4} autres produits
            </p>
          )}
        </div>

        {/* Bouton ouvrir le modal */}
        <button
          onClick={() => setIsOpen(true)}
          className={`
            w-full py-3.5 rounded-2xl font-semibold text-base
            transition-all duration-200 flex items-center justify-center gap-2
            ${props.isCustomizable
              ? 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
              : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
            }
          `}
        >
          {props.isCustomizable ? (
            <>
              <span>⚙️</span>
              Personnaliser &amp; Ajouter au panier
            </>
          ) : (
            <>
              <span>🛒</span>
              Ajouter au panier — {fmt(props.finalPrice)}
            </>
          )}
        </button>

        {props.isCustomizable && (
          <p className="text-xs text-center text-gray-400">
            Vous pouvez retirer les produits optionnels avant d&apos;ajouter au panier
          </p>
        )}
      </div>

      {/* Modal */}
      {isOpen && (
        <CustomizerModal
          {...props}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}