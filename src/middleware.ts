import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

  // Protect ALL management routes
  const protectedPrefixes = [
    '/dashboard',
    '/smes',
    '/production',
    '/documents',
    '/content',
    '/reports',
    '/budget',
    '/admin',
    '/accounts',
    '/legacy',
    '/settings',
    '/generator',
    '/projects',
    '/templates'
  ];

  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix));

  // 1. Unauthenticated users trying to access protected routes -> /login
  if (!role && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. Root URL '/' -> unauthenticated goes to /login, authenticated goes to /dashboard
  if (pathname === '/') {
    if (!role) {
      return NextResponse.redirect(new URL('/login', request.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // 3. Authenticated users trying to access /login -> /dashboard
  if (role && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // 4. Admin-only check (if any routes require STRICTLY 'ADMIN' and not just logged in)
  const strictAdminRoutes = ['/accounts', '/legacy', '/settings'];
  const isStrictAdminRoute = strictAdminRoutes.some(route => pathname.startsWith(route));
  if (isStrictAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
