// .\.\apps\web\middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/commandes', '/mes-reservations', '/my-formations'];
const ADMIN_ROUTES     = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Routes admin ──────────────────────────────────
  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  if (isAdminRoute) {
    const refreshToken = request.cookies.get('refresh_token');
    if (!refreshToken) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url),
      );
    }
    // Note : la vérification du rôle se fait côté client dans le layout
    return NextResponse.next();
  }

  // ─── Routes protégées standard ──────────────────────
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  if (isProtected) {
    const refreshToken = request.cookies.get('refresh_token');
    if (!refreshToken) {
      return NextResponse.redirect(
        new URL(`/login?redirect=${pathname}`, request.url),
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/commandes/:path*',
    '/mes-reservations/:path*',
    '/my-formations/:path*',
    '/admin/:path*',
  ],
};