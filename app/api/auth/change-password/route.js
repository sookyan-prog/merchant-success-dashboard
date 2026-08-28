import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

export async function POST(req) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) {
    return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Fill in both fields.' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'New password needs to be at least 8 characters.' }, { status: 400 });
  }

  const { rows } = await db().query(
    'select id, password_hash from users where id = $1',
    [payload.sub],
  );
  const user = rows[0];
  if (!user) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db().query(
    'update users set password_hash = $1, updated_at = now() where id = $2',
    [newHash, user.id],
  );

  return NextResponse.json({ ok: true });
}
