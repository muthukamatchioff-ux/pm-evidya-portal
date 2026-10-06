import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('user_role')?.value;
  const { pathname } = request.nextUrl;

  // Protect Admin-only routes
  const adminRoutes = ['/accounts', '/legacy', '/settings'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminRoute && role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect unauthenticated from dashboard to login
  if (!role && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated from login to dashboard
  if (role && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
