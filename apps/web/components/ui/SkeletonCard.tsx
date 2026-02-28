export default function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
      {/* Image placeholder */}
      <div className="h-48 bg-gray-200" />

      <div className="p-4 space-y-3">
        {/* Badge placeholder */}
        <div className="h-5 w-16 bg-gray-200 rounded-full" />

        {/* Titre */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Produits inclus */}
        <div className="flex gap-2 pt-1">
          <div className="h-6 w-20 bg-gray-200 rounded-full" />
          <div className="h-6 w-16 bg-gray-200 rounded-full" />
          <div className="h-6 w-24 bg-gray-200 rounded-full" />
        </div>

        {/* Prix + bouton */}
        <div className="flex items-center justify-between pt-2">
          <div className="h-8 w-24 bg-gray-200 rounded" />
          <div className="h-10 w-28 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}