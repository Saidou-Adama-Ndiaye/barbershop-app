import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes nécessitant une authentification
const PROTECTED_ROUTES = ['/commandes', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtected) {
    // Vérifier la présence du cookie refresh_token
    // (le access_token est en mémoire → non accessible depuis middleware)
    const refreshToken = request.cookies.get('refresh_token');

    if (!refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/commandes/:path*', '/admin/:path*'],
};