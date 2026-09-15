import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

function shapeRow(r) {
  return { id: r.id, url: r.url, note: r.note, at: r.at, by: r.by, files: r.files || [], updatedAt: r.updated_at };
}

/* Call-recording DETAILS (file name, size, duration, the optional link, the
   note) are shared the same way proofs are - see /api/proofs for why. The
   actual audio/video file is deliberately NOT sent here and never moves to
   the database: it stays in IndexedDB in whichever browser uploaded it, so
   only that browser can play or download the file itself. Everyone else
   can at least see that a recording exists and read the summary. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query('select id, url, note, at, by, files, updated_at from call_recordings');
  return NextResponse.json({ rows: rows.map(shapeRow) });
}

export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Missing the recording id.' }, { status: 400 });

  const { rows } = await db().query(
    `insert into call_recordings (id, url, note, at, by, files, updated_at) values ($1, $2, $3, $4, $5, $6, now())
     on conflict (id) do update set url = excluded.url, note = excluded.note, at = excluded.at,
       by = excluded.by, files = excluded.files, updated_at = now()
     returning id, url, note, at, by, files, updated_at`,
    [id, body.url || null, body.note || null, body.at || null, body.by || null, JSON.stringify(body.files || [])],
  );
  return NextResponse.json({ row: shapeRow(rows[0]) });
}
