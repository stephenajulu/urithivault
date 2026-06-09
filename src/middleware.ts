import { NextRequest, NextResponse } from 'next/server';
import { decryptSession } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  const sessionCookie = req.cookies.get('session')?.value;
  const preAuthCookie = req.cookies.get('pre_auth')?.value;

  // Decrypt cookies
  const session = sessionCookie ? await decryptSession(sessionCookie) : null;
  const preAuth = preAuthCookie ? await decryptSession(preAuthCookie) : null;

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isDashboardPage = pathname.startsWith('/dashboard');
  const isAdminPage = pathname.startsWith('/admin');
  const isMfaPage = pathname === '/login/mfa';

  // 1. If user has active pre_auth but tries to access elsewhere, redirect to MFA verify
  if (preAuth && !isMfaPage && (isDashboardPage || isAdminPage || isAuthPage)) {
    return NextResponse.redirect(new URL('/login/mfa', req.url));
  }

  // 2. Protect MFA page (only allow if they have a pre_auth token)
  if (isMfaPage && !preAuth) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 3. Protect dashboard and admin pages
  if (isDashboardPage || isAdminPage) {
    if (!session) {
      // Clear any bad cookie and redirect
      const response = NextResponse.redirect(new URL('/login', req.url));
      response.cookies.delete('session');
      return response;
    }

    // Protect admin-only pages
    if (isAdminPage && session.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // 4. Prevent authenticated users from visiting login/register
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/login/mfa',
    '/register',
  ],
};
