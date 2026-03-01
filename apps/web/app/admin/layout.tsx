// .\.\apps\web\app\admin\layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';

const navItems = [
  { href: '/admin',             label: 'Dashboard',    icon: '📊' },
  { href: '/admin/stock',       label: 'Stock',        icon: '📦' },
  { href: '/admin/planning',    label: 'Planning',     icon: '📅' },
  { href: '/admin/analytics',   label: 'Analytics',    icon: '📈' },
  { href: '/admin/utilisateurs',label: 'Utilisateurs', icon: '👥' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  // Vérification rôle admin côté client
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/admin');
        return;
      }
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (!isAdmin) {
        router.push('/403');
      }
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

      {/* ─── Sidebar ─────────────────────────────────── */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-30">

        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">✂️</span>
            <div>
              <p className="text-white font-bold text-lg leading-none">BarberShop</p>
              <p className="text-gray-400 text-xs mt-0.5">Admin Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold">
              {user?.firstName?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-400 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <Link
            href="/packs"
            className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            ← Retour au site
          </Link>
        </div>
      </aside>

      {/* ─── Contenu principal ─────────────────────── */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}