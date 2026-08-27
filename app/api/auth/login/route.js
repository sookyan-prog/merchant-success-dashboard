import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '../../../../lib/db';
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../lib/auth';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  const { rows } = await db().query(
    'select id, email, name, role, password_hash from users where lower(email) = $1',
    [email],
  );
  const user = rows[0];
  /* Compare against a real hash even when no user exists, so the response
     time and error message for "wrong password" and "no such account"
     look identical - a login form is exactly the wrong place to reveal
     which emails have accounts. */
  const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidin';
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }

  const token = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
