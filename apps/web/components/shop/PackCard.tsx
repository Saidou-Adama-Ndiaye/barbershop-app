// .\.\apps\web\components\shop\PackCard.tsx
import Image from 'next/image';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import WishlistButton from './WishlistButton';
import StarRating from './StarRating';

// ─── Types ────────────────────────────────────────────────
interface PackProduct {
  id: string;
  product: { name: string };
  quantity: number;
  isOptional: boolean;
}

export interface PackCardProps {
  id: string;
  slug: string;
  name: string;
  description?: string;
  basePrice: number;
  discountPct: number;
  finalPrice: number;
  imageUrls: string[];
  isCustomizable: boolean;
  packProducts: PackProduct[];
  avgRating?: number;
  reviewCount?: number;
}

// ─── Helper ───────────────────────────────────────────────
const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

// ─── Composant ────────────────────────────────────────────
export default function PackCard({
  id,
  slug,
  name,
  description,
  basePrice,
  discountPct,
  finalPrice,
  imageUrls,
  isCustomizable,
  packProducts,
  avgRating = 0,
  reviewCount = 0,
}: PackCardProps) {
  const hasDiscount = discountPct > 0;
  const imageUrl    = imageUrls?.[0] ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col group">

      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-600">
            <span className="text-4xl">✂️</span>
          </div>
        )}

        {/* Badge réduction */}
        {hasDiscount && (
          <div className="absolute top-3 left-3">
            <Badge variant="red">-{discountPct}%</Badge>
          </div>
        )}

        {/* Badge coupon actif */}
        {/* {activeCouponLabel && ( */}
          <div className="absolute bottom-3 left-3">
            <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
              🏷️ "ex: Code PROMO10 disponible"
            </span>
          </div>

        {/* Badge personnalisable */}
        {isCustomizable && (
          <div className="absolute top-3 left-3 mt-7">
            {!hasDiscount && <Badge variant="blue">Personnalisable</Badge>}
          </div>
        )}

        {/* Bouton wishlist ❤️ */}
        <div className="absolute top-3 right-3">
          <WishlistButton packId={id} size="md" />
        </div>
      </div>

      {/* Contenu */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-lg leading-tight mb-1">
          {name}
        </h3>

        {/* Note étoiles */}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <StarRating value={avgRating} readonly size="sm" />
            <span className="text-xs text-gray-400">
              ({reviewCount} avis)
            </span>
          </div>
        )}

        {description && (
          <p className="text-gray-500 text-sm line-clamp-2 mb-3">
            {description}
          </p>
        )}

        {/* Produits inclus */}
        {packProducts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {packProducts.slice(0, 3).map((pp) => (
              <span
                key={pp.id}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
              >
                {pp.product.name}
                {pp.quantity > 1 && ` x${pp.quantity}`}
              </span>
            ))}
            {packProducts.length > 3 && (
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full">
                +{packProducts.length - 3} autres
              </span>
            )}
          </div>
        )}

        {/* Prix + CTA */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
          <div>
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(finalPrice)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through ml-2">
                {formatPrice(basePrice)}
              </span>
            )}
          </div>

          <Link
            href={`/packs/${slug}`}
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
          >
            Voir le pack
          </Link>
        </div>
      </div>
    </div>
  );
}