import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, isValidToken } from '@/lib/auth';

// Protect the whole app behind the session cookie. Everything except the login page and
// Next's own assets requires a valid session — including /files (permit PDFs contain PII).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (await isValidToken(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except static asset files (which have a dot in the last segment).
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$).*)'],
};
