// apps\web\app\admin\layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';

const navItems = [
  { href: '/admin',              label: 'Dashboard',    icon: '📊' },
  { href: '/admin/categories',   label: 'Catégories',   icon: '🏷️'  },
  { href: '/admin/produits',     label: 'Produits',     icon: '📦' },
  { href: '/admin/packs',        label: 'Packs',        icon: '🎁' },
  { href: '/admin/services',     label: 'Services',     icon: '✂️'  },
  { href: '/admin/formations',   label: 'Formations',   icon: '🎓' },
  { href: '/admin/commandes',    label: 'Commandes',    icon: '🛒' },
  { href: '/admin/coupons',      label: 'Coupons',      icon: '🎟️' },
  { href: '/admin/reviews',      label: 'Avis',         icon: '⭐' },
  { href: '/admin/stock',        label: 'Stock',        icon: '📉' },
  { href: '/admin/planning',     label: 'Planning',     icon: '📅' },
  { href: '/admin/coiffeurs',    label: 'Coiffeurs',    icon: '👨‍💼' },
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👥' },
  { href: '/admin/logs',         label: 'Audit Logs',   icon: '🔍' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
        return;
      }
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (!isAdmin) router.push('/403');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <span className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-gray-950">

      {/* ─── Sidebar ──────────────────────────────────── */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-30">

        {/* Logo */}
        <div className="p-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">✂️</span>
            <div>
              <p className="text-white font-bold leading-none">BarberShop</p>
              <p className="text-gray-400 text-xs mt-0.5">Admin</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold">
              {user?.firstName?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-400 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <Link
            href="/packs"
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Site
          </Link>
        </div>
      </aside>

      {/* ─── Contenu principal ────────────────────────── */}
      <main className="flex-1 ml-56 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}