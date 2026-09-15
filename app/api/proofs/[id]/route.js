import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  await db().query('delete from proofs where id = $1', [params.id]);
  return NextResponse.json({ ok: true });
}
