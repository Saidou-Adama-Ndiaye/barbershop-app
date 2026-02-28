'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// ─── Types ────────────────────────────────────────────────
interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMin: number;
  depositPct: number;
  inclusions: string[];
  isActive: boolean;
}

// ─── Helpers ──────────────────────────────────────────────
const formatPrice = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
  }).format(amount);

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
};

// Couleurs par formule
const serviceColors: Record<string, string> = {
  Simple:  'from-gray-700  to-gray-900',
  VIP:     'from-blue-700  to-blue-900',
  Star:    'from-purple-700 to-purple-900',
  Ultra:   'from-amber-600 to-amber-800',
  Premium: 'from-emerald-600 to-emerald-800',
};

// ─── Composant ServiceCard ────────────────────────────────
function ServiceCard({
  service,
  onBook,
}: {
  service: Service;
  onBook: (service: Service) => void;
}) {
  const gradient = serviceColors[service.name] ?? 'from-gray-700 to-gray-900';
  const depositAmount = Math.round((service.price * service.depositPct) / 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Header coloré */}
      <div className={`bg-gradient-to-br ${gradient} p-6 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold">{service.name}</h3>
            {service.description && (
              <p className="text-white/80 text-sm mt-1">{service.description}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatPrice(service.price)}</p>
            <p className="text-white/70 text-xs mt-0.5">
              {formatDuration(service.durationMin)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="p-5 flex flex-col flex-1">
        {/* Inclusions */}
        {service.inclusions?.length > 0 && (
          <ul className="space-y-1.5 mb-4 flex-1">
            {service.inclusions.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs flex-shrink-0">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Acompte info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-amber-800 text-xs">
            <strong>Acompte requis :</strong>{' '}
            {formatPrice(depositAmount)} ({service.depositPct}%)
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => onBook(service)}
          className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-semibold hover:bg-gray-700 transition-colors text-sm"
        >
          Réserver cette formule
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function ServicesPage() {
  const router = useRouter();

  const { data: services, isLoading, isError } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get<Service[]>('/services');
      return data;
    },
  });

  const handleBook = (service: Service) => {
    router.push(`/calendrier?serviceId=${service.id}&serviceName=${encodeURIComponent(service.name)}&price=${service.price}&duration=${service.durationMin}`);
  };

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Nos Formules</h1>
        <p className="text-gray-500 mt-1">
          Choisissez la formule qui vous convient et réservez en ligne
        </p>
      </div>

      {/* Erreur */}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          Impossible de charger les formules. Vérifiez que l&apos;API est démarrée.
        </div>
      )}

      {/* Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Grille services */}
      {services && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onBook={handleBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}