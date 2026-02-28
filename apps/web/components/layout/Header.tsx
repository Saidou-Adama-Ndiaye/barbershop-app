'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart.store';
import { useAuthStore } from '@/lib/store/auth.store';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function Header() {
  const totalItems    = useCartStore((s) => s.totalItems);
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/packs" className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <span className="text-2xl">✂️</span>
          <span>BarberShop</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/packs" className="hover:text-gray-900 transition-colors">
            Catalogue
          </Link>
          {isAuthenticated && (
            <Link href="/commandes" className="hover:text-gray-900 transition-colors">
              Mes commandes
            </Link>
          )}
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-3">

          {/* Panier */}
          <Link
            href="/panier"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
            aria-label="Panier"
          >
            <span className="text-xl">🛒</span>
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems > 99 ? '99+' : totalItems}
              </span>
            )}
          </Link>

          {/* Profil / Connexion */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:block text-sm text-gray-600">
                {user.firstName}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}