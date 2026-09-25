import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Same shared-jsonb-blob, full-replace-sync pattern as campaign_activities
   and escalations - see 007_campaign_and_escalations.sql for why. Anyone
   signed in can read the whole table (the client filters down to "mine" -
   see myNotifs() in dashboard.html), and anyone signed in can write to it,
   since both a manager sending a note and an AM's own action (naming a
   cover for time off) create notifications addressed to someone else. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query('select data from notifications order by updated_at asc');
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
        `insert into notifications (id, data, updated_at) values ($1, $2, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        [row.ID, JSON.stringify(row)],
      );
    }
    if (ids.length) {
      await client.query('delete from notifications where not (id = any($1::uuid[]))', [ids]);
    } else {
      await client.query('delete from notifications');
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
