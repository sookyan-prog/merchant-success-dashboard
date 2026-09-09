import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Same shared-jsonb-blob, full-replace-sync pattern as campaign_activities -
   see the comment there for why. Escalations used to live only in each
   person's own browser, so a case one AM raised was invisible to everyone
   else, including a manager checking on it. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query('select data from escalations order by updated_at asc');
  return NextResponse.json({ rows: rows.map((r) => r.data) });
}

export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.rows) ? body.rows : [];
  const ids = list.map((r) => r && r.ID).filter(Boolean);

  const client = await db().connect();
  try {
    await client.query('begin');
    for (const row of list) {
      if (!row || !row.ID) continue;
      await client.query(
        `insert into escalations (id, data, updated_at) values ($1, $2, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        [row.ID, JSON.stringify(row)],
      );
    }
    if (ids.length) {
      await client.query('delete from escalations where not (id = any($1::uuid[]))', [ids]);
    } else {
      await client.query('delete from escalations');
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }

  return NextResponse.json({ ok: true, count: list.length });
}
