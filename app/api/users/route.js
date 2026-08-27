import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireManager() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload || payload.role !== 'manager') return null;
  return payload;
}

/* Manager-only: list every account so Sook Yan can see who already has a
   login, without ever exposing password hashes to the browser. */
export async function GET() {
  const me = await requireManager();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  const { rows } = await db().query(
    'select id, email, name, role, created_at from users order by created_at desc',
  );
  return NextResponse.json({ users: rows });
}

/* Manager-only: create an account manager's login. The manager sets the
   first password herself here, rather than the app inventing one - an AM
   can change it later once there's a "change password" screen, but there
   isn't one of those yet, so this is the one place a password gets set. */
export async function POST(req) {
  const me = await requireManager();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim();
  const password = String(body.password || '');
  const role = body.role === 'manager' ? 'manager' : 'am';

  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Name, email and a starting password are all required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Use at least 8 characters for the starting password.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await db().query(
      `insert into users (email, password_hash, name, role)
       values ($1, $2, $3, $4)
       returning id, email, name, role, created_at`,
      [email, hash, name, role],
    );
    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (e) {
    if (String(e.message || '').includes('duplicate key')) {
      return NextResponse.json({ error: 'That email already has an account.' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
  }
}
