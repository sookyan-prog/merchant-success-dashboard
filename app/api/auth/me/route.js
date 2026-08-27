import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: { id: payload.sub, email: payload.email, name: payload.name, role: payload.role },
  });
}
