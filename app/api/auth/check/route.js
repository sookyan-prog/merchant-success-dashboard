import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

/* Called by middleware.js before it serves a page. The edge runtime cannot
   reach the database, so it asks this route whether the signed-in account
   still exists (see verifySession in lib/auth.js). */
export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  return NextResponse.json({ ok: !!payload }, { status: payload ? 200 : 401 });
}
