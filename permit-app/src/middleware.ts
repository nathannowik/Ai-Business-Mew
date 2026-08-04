import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, readSession } from '@/lib/auth';

// Gate the whole app behind a valid session cookie. Everything except the login page and
// Next's own assets requires a signed session — including /files (PDFs contain PII).
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/login' || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const userId = await readSession(req.cookies.get(COOKIE_NAME)?.value);
  if (userId) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = pathname === '/' ? '' : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js)$).*)'],
};
