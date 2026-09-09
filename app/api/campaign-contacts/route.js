import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Campaign contacts isn't a list of independent rows - it's one shared
   lookup object (store ID -> phone/email overrides), so it gets a single
   "singleton" row instead of one row per contact. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query("select data from campaign_contacts where id = 'singleton'");
  return NextResponse.json({ data: rows.length ? rows[0].data : {} });
}

export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const data = body && typeof body.data === 'object' && body.data ? body.data : {};

  await db().query(
    `insert into campaign_contacts (id, data, updated_at) values ('singleton', $1, now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [JSON.stringify(data)],
  );

  return NextResponse.json({ ok: true });
}
