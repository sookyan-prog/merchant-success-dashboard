import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE = 'ms_session';

/* Runs on the Edge runtime, so it uses jose directly rather than importing
   lib/auth.js (which also pulls in bcrypt/pg - fine in a Node route, not
   guaranteed to work here). Every request in the matcher below has to
   carry a valid session cookie or it gets bounced to /login; the login
   page and its own API route are deliberately left out of the matcher so
   there's a way to reach them un-authenticated. */
async function hasValidSession(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req) {
  if (await hasValidSession(req)) return NextResponse.next();
  /* API calls get a JSON 401 rather than an HTML redirect - the dashboard's
     own JS is what's calling these, not a browser navigation, so sending
     it a login page to parse would just look like a broken response. */
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  loginUrl.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard.html', '/admin/:path*', '/account/:path*', '/api/users/:path*', '/api/auth/change-password'],
};
