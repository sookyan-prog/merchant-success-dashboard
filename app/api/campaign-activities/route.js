import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Campaign activities used to live entirely in each person's own browser
   (localStorage), so a campaign one teammate set up was invisible to
   everyone else. Each row is stored as a jsonb blob rather than one column
   per field: the client's row shape already carries its own id and has many
   nested fields (per-day schedule tracking, webinar lists, multi-language
   message variants), so re-mapping that field-by-field onto SQL columns
   would just be a second, easy-to-drift copy of the same shape. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query('select data from campaign_activities order by updated_at asc');
  return NextResponse.json({ rows: rows.map((r) => r.data) });
}

/* The client always calls this with its complete, current array (every
   mutation - add, edit, delete - already rebuilds the full list before
   saving), so this is a full-replace sync rather than a single-row upsert:
   every given row is upserted by id, and any existing row whose id is not
   in the given set gets deleted. That second half matters - without it, a
   row deleted in one browser would keep reappearing everywhere else. */
export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.rows) ? body.rows : [];
  const ids = list.map((r) => r && r.ID).filter(Boolean);

  /* begin/commit only hold across a single physical connection, not across
     separate pool.query() calls (each of those can be handed a different
     connection) - so this checks out one client from the pool up front and
     runs the whole transaction on it. */
  const client = await db().connect();
  try {
    await client.query('begin');
    for (const row of list) {
      if (!row || !row.ID) continue;
      await client.query(
        `insert into campaign_activities (id, data, updated_at) values ($1, $2, now())
         on conflict (id) do update set data = excluded.data, updated_at = now()`,
        [row.ID, JSON.stringify(row)],
      );
    }
    if (ids.length) {
      await client.query('delete from campaign_activities where not (id = any($1::uuid[]))', [ids]);
    } else {
      await client.query('delete from campaign_activities');
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
