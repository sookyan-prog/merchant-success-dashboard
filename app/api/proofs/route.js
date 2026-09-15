import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

function shapeRow(r) {
  return { id: r.id, data: r.data, at: r.at, by: r.by, updatedAt: r.updated_at };
}

/* Proof-of-contact screenshots used to live only in each person's own
   browser (localStorage), so a manager checking Team files saw nothing
   until someone exported a file and sent it over by hand. Any signed-in
   account manager can read the whole set - a screenshot proving a message
   went out is exactly the kind of thing a manager needs to see without
   waiting for an export. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query('select id, data, at, by, updated_at from proofs');
  return NextResponse.json({ rows: rows.map(shapeRow) });
}

/* One key at a time - the client only ever attaches, replaces or removes a
   single proof, never rewrites the whole set, so this is a single upsert
   rather than a bulk sync. "id" is the same business key the app already
   uses to address a proof (a merchant/opportunity ID, or "hc-<store id>"
   for a health check), not a generated one. */
export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  const data = body.data;
  if (!id || !data) return NextResponse.json({ error: 'Missing the proof id or image.' }, { status: 400 });

  const { rows } = await db().query(
    `insert into proofs (id, data, at, by, updated_at) values ($1, $2, $3, $4, now())
     on conflict (id) do update set data = excluded.data, at = excluded.at, by = excluded.by, updated_at = now()
     returning id, data, at, by, updated_at`,
    [id, data, body.at || null, body.by || null],
  );
  return NextResponse.json({ row: shapeRow(rows[0]) });
}
