// apps/web/components/shop/StarRating.tsx
'use client';

interface StarRatingProps {
  value: number;          // 0 à 5 (accepte les demi-étoiles)
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const sizeClass = size === 'sm'
    ? 'text-sm'
    : size === 'lg'
    ? 'text-3xl'
    : 'text-xl';

  const stars = [1, 2, 3, 4, 5];

  const getStar = (star: number) => {
    if (value >= star)      return '★';       // pleine
    if (value >= star - 0.5) return '⭐';    // demi (fallback visuel)
    return '☆';                               // vide
  };

  const getColor = (star: number) => {
    if (value >= star - 0.5) return 'text-amber-400';
    return 'text-gray-300';
  };

  return (
    <div className={`flex items-center gap-0.5 ${sizeClass}`}>
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`
            ${getColor(star)}
            transition-colors duration-150
            ${!readonly ? 'hover:text-amber-400 cursor-pointer' : 'cursor-default'}
            ${!readonly ? 'hover:scale-110 transition-transform' : ''}
            disabled:cursor-default
          `}
        >
          {getStar(star)}
        </button>
      ))}
    </div>
  );
}