import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { ensureSchema } from '../../../../lib/ensureSchema';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* With no query: the file's details, plus its data when it fits in one piece.
   With ?chunk=N: piece N of a file that was uploaded in several. */
export async function GET(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();

  const chunk = new URL(req.url).searchParams.get('chunk');
  if (chunk !== null) {
    const { rows } = await db().query('select data from recording_files where id = $1', [`${params.id}#${Number(chunk) || 0}`]);
    if (!rows[0]) return NextResponse.json({ error: 'That piece of the file is missing.' }, { status: 404 });
    return NextResponse.json({ data: rows[0].data });
  }
  const { rows } = await db().query('select id, name, type, size, chunks, data from recording_files where id = $1', [params.id]);
  if (!rows[0]) return NextResponse.json({ error: 'That file is no longer here.' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();
  if (me.role !== 'manager') {
    const cur = await db().query('select uploaded_by from recording_files where id = $1', [params.id]);
    if (cur.rows[0] && cur.rows[0].uploaded_by !== me.name) {
      return NextResponse.json({ error: 'Only the person who attached it, or a manager, can remove it.' }, { status: 403 });
    }
  }
  await db().query('delete from recording_files where id = $1 or id like $2', [params.id, `${params.id}#%`]);
  return NextResponse.json({ ok: true });
}
