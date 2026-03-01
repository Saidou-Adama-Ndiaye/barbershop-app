// .\.\apps\web\app\(shop)\packs\[slug]\page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import api from '@/lib/api';
import PackCustomizer from '@/components/shop/PackCustomizer';
import Badge from '@/components/ui/Badge';
import SkeletonCard from '@/components/ui/SkeletonCard';

// ─── Types ────────────────────────────────────────────────
interface PackDetail {
  id: string;
  slug: string;
  name: string;
  description?: string;
  basePrice: number;
  discountPct: number;
  finalPrice: number;
  imageUrls: string[];
  isCustomizable: boolean;
  category?: { name: string; slug: string };
  packProducts: {
    id: string;
    productId: string;
    product: { id: string; name: string; unitPrice: number };
    quantity: number;
    isOptional: boolean;
  }[];
}

const formatPrice = (amount: number): string =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

// ─── Composant ────────────────────────────────────────────
export default function PackDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const { data: pack, isLoading, isError } = useQuery({
    queryKey: ['pack', slug],
    queryFn: async () => {
      const { data } = await api.get<PackDetail>(`/packs/${slug}`);
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkeletonCard />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !pack) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">❌</span>
        <p className="text-lg font-medium text-gray-700">Pack introuvable</p>
        <button
          onClick={() => router.push('/packs')}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-900"
        >
          Retour au catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.push('/packs')} className="hover:text-gray-900 transition-colors">
          Catalogue
        </button>
        <span>›</span>
        {pack.category && (
          <>
            <span>{pack.category.name}</span>
            <span>›</span>
          </>
        )}
        <span className="text-gray-900 font-medium">{pack.name}</span>
      </nav>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

        {/* Colonne gauche : image */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100">
            {pack.imageUrls?.[0] ? (
              <Image
                src={pack.imageUrls[0]}
                alt={pack.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-800 to-gray-600">
                <span className="text-8xl">✂️</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {pack.discountPct > 0 && (
                <Badge variant="red">-{pack.discountPct}% de réduction</Badge>
              )}
              {pack.isCustomizable && (
                <Badge variant="blue">Personnalisable</Badge>
              )}
            </div>
          </div>

          {/* Galerie miniatures */}
          {pack.imageUrls?.length > 1 && (
            <div className="flex gap-2">
              {pack.imageUrls.slice(1, 4).map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                  <Image src={url} alt={`${pack.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : infos + personnalisation */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{pack.name}</h1>
            {pack.description && (
              <p className="text-gray-600 mt-3 leading-relaxed">{pack.description}</p>
            )}
          </div>

          {/* Prix */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gray-900">
              {formatPrice(pack.finalPrice)}
            </span>
            {pack.discountPct > 0 && (
              <span className="text-xl text-gray-400 line-through">
                {formatPrice(pack.basePrice)}
              </span>
            )}
          </div>

          {/* PackCustomizer */}
          <PackCustomizer
            packId={pack.id}
            packName={pack.name}
            packSlug={pack.slug}
            basePrice={pack.basePrice}
            finalPrice={pack.finalPrice}
            discountPct={pack.discountPct}
            isCustomizable={pack.isCustomizable}
            packProducts={pack.packProducts}
          />
        </div>
      </div>
    </div>
  );
}