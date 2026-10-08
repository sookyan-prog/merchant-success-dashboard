import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { ensureSchema } from '../../../lib/ensureSchema';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';
import { canonAM } from '../../../lib/canonAM';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Business Health Check sessions, shared. Everyone signed in reads the whole
   book (the dashboard filters it down to "mine" for a non-manager, same as
   the Upgrade pipeline). Writes are per row, never a full-list replace: a
   browser that has not seen a teammate's newest session yet cannot wipe it
   out by saving its own. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();
  const { rows } = await db().query('select data from bhc order by updated_at desc');
  return NextResponse.json({ rows: rows.map((r) => r.data) });
}

/* Accepts { rows: [...] }. An account manager can only save sessions that
   belong to them (compared after folding the alias spellings together, same
   as every other route); a manager can save anyone's. Anything that does not
   pass is skipped and reported, not silently dropped. */
export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();

  const body = await req.json().catch(() => ({}));
  const list = Array.isArray(body.rows) ? body.rows : body.row ? [body.row] : [];
  const isMgr = me.role === 'manager';
  const mine = canonAM(me.name);

  const saved = [];
  const refused = [];
  for (const row of list) {
    if (!row || !row.ID) continue;
    const id = String(row.ID);
    if (!isMgr) {
      if (canonAM(row.AM) !== mine) { refused.push(id); continue; }
      const cur = await db().query('select data from bhc where id = $1', [id]);
      if (cur.rows[0] && canonAM(cur.rows[0].data && cur.rows[0].data.AM) !== mine) { refused.push(id); continue; }
    }
    await db().query(
      `insert into bhc (id, data, updated_at) values ($1, $2, now())
       on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [id, JSON.stringify(row)],
    );
    saved.push(id);
  }
  return NextResponse.json({ ok: refused.length === 0, saved, refused }, { status: refused.length ? 403 : 200 });
}
