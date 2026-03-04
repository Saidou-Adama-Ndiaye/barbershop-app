// apps\web\components\layout\Header.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCartStore }          from '@/lib/store/cart.store';
import { useAuthStore }          from '@/lib/store/auth.store';
import { useWishlistStore }       from '@/lib/store/wishlist.store';
import { useNotificationsStore }  from '@/lib/store/notifications.store';
import { logout }                from '@/lib/auth';
import { resendVerification }    from '@/lib/profile';
import { useRouter }             from 'next/navigation';
import api                       from '@/lib/api';
import NotificationBell          from '@/components/ui/NotificationBell';

export default function Header() {
  const totalItems  = useCartStore((s) => s.totalItems);
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const { packIds } = useWishlistStore();
  const { fetch: fetchNotifications } = useNotificationsStore();
  const router      = useRouter();
  const [avatarUrl,   setAvatarUrl]   = useState<string | null>(null);
  const [resendSent,  setResendSent]  = useState(false);
  const [showBanner,  setShowBanner]  = useState(false);

  const wishlistCount = packIds.size;

  // ─── Charger l'URL signée de l'avatar ─────────────────
  useEffect(() => {
    if (!user || !isAuthenticated) {
      setAvatarUrl(null);
      setShowBanner(false);
      return;
    }

    setShowBanner(!user.isVerified);

    const loadAvatar = async () => {
      try {
        const { data } = await api.get<{ avatarUrl: string | null }>('/users/me');
        if (data.avatarUrl) {
          const { data: signedData } = await api.get<{ url: string }>(
            `/users/me/avatar-url`,
          );
          setAvatarUrl(signedData.url);
        }
      } catch {
        // Silencieux
      }
    };

    loadAvatar();
  }, [user, isAuthenticated]);

  // ─── Fetch notifications dès que connecté ─────────────
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  const handleLogout = async () => {
    await logout();
    clearAuth();
    router.push('/login');
  };

  const handleResendVerification = async () => {
    try {
      await resendVerification();
      setResendSent(true);
    } catch {
      // silencieux
    }
  };

  const initiales = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '';

  return (
    <>
      {/* Banner email non vérifié */}
      {isAuthenticated && showBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <span>⚠️</span>
              <span>
                Votre email n&apos;est pas vérifié.
                Consultez votre boîte mail pour activer votre compte.
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {resendSent ? (
                <span className="text-xs text-amber-700 font-medium">✅ Email envoyé !</span>
              ) : (
                <button
                  onClick={handleResendVerification}
                  className="text-xs text-amber-700 underline hover:text-amber-900 transition-colors"
                >
                  Renvoyer le lien
                </button>
              )}
              <button
                onClick={() => setShowBanner(false)}
                className="text-amber-400 hover:text-amber-700 transition-colors text-lg leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header principal */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/packs"
            className="flex items-center gap-2 font-bold text-xl text-gray-900"
          >
            <span className="text-2xl">✂️</span>
            <span>BarberShop</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link href="/packs" className="hover:text-gray-900 transition-colors">
              Catalogue
            </Link>
            <Link href="/services" className="hover:text-gray-900 transition-colors">
              Réservations
            </Link>
            <Link href="/formations" className="hover:text-gray-900 transition-colors">
              Formations
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/commandes" className="hover:text-gray-900 transition-colors">
                  Mes commandes
                </Link>
                <Link href="/mes-reservations" className="hover:text-gray-900 transition-colors">
                  Mes RDV
                </Link>
                <Link href="/my-formations" className="hover:text-gray-900 transition-colors">
                  Mes formations
                </Link>
              </>
            )}
          </nav>

          {/* Actions droite */}
          <div className="flex items-center gap-2">

            {/* Wishlist (visible si connecté) */}
            {isAuthenticated && (
              <Link
                href="/wishlist"
                className="relative flex items-center justify-center w-10 h-10 rounded-xl hover:bg-red-50 transition-colors group"
                aria-label="Mes favoris"
                title="Mes favoris"
              >
                <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${
                  wishlistCount > 0 ? '' : 'grayscale opacity-60'
                }`}>
                  {wishlistCount > 0 ? '❤️' : '🤍'}
                </span>
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>
            )}

            {/* ── Cloche notifications (visible si connecté) ── */}
            {isAuthenticated && <NotificationBell />}

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
                <Link
                  href="/profil"
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  title="Mon profil"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-900 flex items-center justify-center border-2 border-gray-200">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-bold">{initiales}</span>
                    )}
                  </div>
                  <span className="hidden md:block text-sm text-gray-600 font-medium">
                    {user.firstName}
                  </span>
                </Link>

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
    </>
  );
}