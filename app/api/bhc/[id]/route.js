import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/ensureSchema';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';
import { canonAM } from '../../../../lib/canonAM';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();

  if (me.role !== 'manager') {
    const cur = await db().query('select data from bhc where id = $1', [params.id]);
    if (cur.rows[0] && canonAM(cur.rows[0].data && cur.rows[0].data.AM) !== canonAM(me.name)) {
      return NextResponse.json({ error: 'That session belongs to someone else.' }, { status: 403 });
    }
  }
  await db().query('delete from bhc where id = $1', [params.id]);
  return NextResponse.json({ ok: true });
}
