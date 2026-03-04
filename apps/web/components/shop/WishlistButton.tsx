// apps/web/components/shop/WishlistButton.tsx
'use client';

import { useState } from 'react';
import { useWishlistStore } from '@/lib/store/wishlist.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { useRouter } from 'next/navigation';

interface WishlistButtonProps {
  packId: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function WishlistButton({
  packId,
  size = 'md',
  className = '',
}: WishlistButtonProps) {
  const { isAuthenticated } = useAuthStore();
  const { toggle, isInWishlist } = useWishlistStore();
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const inWishlist = isInWishlist(packId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push('/login?redirect=/wishlist');
      return;
    }

    setIsAnimating(true);
    await toggle(packId);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const sizeClasses = size === 'sm'
    ? 'w-7 h-7 text-sm'
    : 'w-9 h-9 text-base';

  return (
    <button
      onClick={handleClick}
      title={inWishlist ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`
        ${sizeClasses}
        rounded-full flex items-center justify-center
        transition-all duration-200 select-none
        ${inWishlist
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-white/90 text-gray-400 hover:text-red-400 hover:bg-red-50'
        }
        ${isAnimating ? 'scale-125' : 'scale-100'}
        shadow-sm backdrop-blur-sm
        ${className}
      `}
    >
      <span
        className={`transition-transform duration-200 ${
          isAnimating ? 'scale-110' : 'scale-100'
        }`}
      >
        {inWishlist ? '❤️' : '🤍'}
      </span>
    </button>
  );
}