// apps/web/app/(shop)/wishlist/page.tsx
'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/auth.store';
import { useCartStore } from '@/lib/store/cart.store';
import { useWishlistStore } from '@/lib/store/wishlist.store';
import { getWishlist, WishlistPack } from '@/lib/wishlist';
import WishlistButton from '@/components/shop/WishlistButton';
import StarRating from '@/components/shop/StarRating';
import SkeletonCard from '@/components/ui/SkeletonCard';
import { useRouter } from 'next/navigation';

const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const { packIds } = useWishlistStore();
  const router = useRouter();

  // Rediriger si non connecté
  useEffect(() => {
    if (!isAuthenticated) router.push('/login?redirect=/wishlist');
  }, [isAuthenticated, router]);

  const {
    data: wishlist,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['wishlist', Array.from(packIds)],
    queryFn:  getWishlist,
    enabled:  isAuthenticated,
  });

  // Re-fetch quand la wishlist change (toggle)
  useEffect(() => {
    if (isAuthenticated) refetch();
  }, [packIds, isAuthenticated, refetch]);

  const handleAddToCart = (item: WishlistPack) => {
    const pack = item.pack;
    const discountAmount = (Number(pack.basePrice) * Number(pack.discountPct)) / 100;
    const finalPrice = Math.round(Number(pack.basePrice) - discountAmount);

    addItem({
      packId:    pack.id,
      packName:  pack.name,
      packSlug:  pack.slug,
      quantity:  1,
      unitPrice: finalPrice,
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-8">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mes Favoris</h1>
          <p className="text-gray-500 mt-1">
            {wishlist?.length ?? 0} pack{(wishlist?.length ?? 0) > 1 ? 's' : ''} sauvegardé{(wishlist?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/packs"
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Voir le catalogue
        </Link>
      </div>

      {/* Chargement */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Wishlist vide */}
      {!isLoading && (!wishlist || wishlist.length === 0) && (
        <div className="text-center py-20">
          <span className="text-6xl block mb-4">🤍</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Votre liste de favoris est vide
          </h2>
          <p className="text-gray-500 mb-6">
            Cliquez sur le cœur d&apos;un pack pour l&apos;ajouter ici
          </p>
          <Link
            href="/packs"
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            Découvrir les packs
          </Link>
        </div>
      )}

      {/* Grille packs favoris */}
      {!isLoading && wishlist && wishlist.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => {
            const pack = item.pack;
            const hasDiscount = Number(pack.discountPct) > 0;
            const finalPrice  = Math.round(
              Number(pack.basePrice) -
              (Number(pack.basePrice) * Number(pack.discountPct)) / 100,
            );
            const imageUrl = pack.imageUrls?.[0] ?? null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col group"
              >
                {/* Image */}
                <div className="relative h-44 bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={pack.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-600">
                      <span className="text-4xl">✂️</span>
                    </div>
                  )}

                  {hasDiscount && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      -{pack.discountPct}%
                    </div>
                  )}

                  {/* Bouton retirer des favoris */}
                  <div className="absolute top-3 right-3">
                    <WishlistButton packId={pack.id} size="md" />
                  </div>
                </div>

                {/* Contenu */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight mb-1">
                    {pack.name}
                  </h3>

                  {/* Étoiles */}
                  {pack.reviewCount > 0 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <StarRating value={pack.avgRating} readonly size="sm" />
                      <span className="text-xs text-gray-400">
                        ({pack.reviewCount})
                      </span>
                    </div>
                  )}

                  {pack.description && (
                    <p className="text-gray-500 text-sm line-clamp-2 mb-3">
                      {pack.description}
                    </p>
                  )}

                  {/* Prix + Actions */}
                  <div className="mt-auto pt-3 border-t border-gray-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(finalPrice)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-gray-400 line-through ml-2">
                            {formatPrice(Number(pack.basePrice))}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 bg-gray-900 text-white text-sm font-medium py-2 rounded-xl hover:bg-gray-700 transition-colors"
                      >
                        🛒 Ajouter au panier
                      </button>
                      <Link
                        href={`/packs/${pack.slug}`}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}