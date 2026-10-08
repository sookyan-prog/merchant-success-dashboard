import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { ensureSchema } from '../../../lib/ensureSchema';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

/* Health check evidence that is a file: an image, a PDF, or an audio/video
   recording. Stored as base64 text in Postgres, the same way proof
   screenshots already are, so the manager can open it on her own computer.

   Anything bigger than one request can carry arrives in pieces: the browser
   slices the file and sends each slice with its position (idx of total).
   Each slice is its own row ("<id>#<idx>"); a main row under the plain id
   records the name, type, size and how many slices there are. */
const MAX_CHUNK_CHARS = 3_400_000;       // about 2.5 MB of file per request
const MAX_FILE_BYTES = 25 * 1048576;     // 25 MB per file
const ALLOWED = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|audio\/.+|video\/.+)$/i;

export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  const key = String(body.key || '').trim();
  const name = String(body.name || '').trim() || 'file';
  const type = String(body.type || '').trim();
  const data = String(body.data || '');
  const size = Number(body.size) || 0;
  const total = Math.max(1, Math.min(40, Number(body.total) || 1));
  const idx = Math.max(0, Math.min(total - 1, Number(body.idx) || 0));
  if (!id || !key || !data) return NextResponse.json({ error: 'That upload was incomplete.' }, { status: 400 });
  if (!ALLOWED.test(type)) return NextResponse.json({ error: 'Only images, PDFs, audio and video can be attached. Use a Google Drive link for anything else.' }, { status: 400 });
  if (data.length > MAX_CHUNK_CHARS) return NextResponse.json({ error: 'That piece of the file was too large to send.' }, { status: 413 });
  if (size > MAX_FILE_BYTES) return NextResponse.json({ error: 'That file is over 25 MB. Paste a Google Drive link instead.' }, { status: 413 });

  const put = (rowId, rowData, chunks) => db().query(
    `insert into recording_files (id, rec_key, name, type, size, data, chunks, uploaded_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (id) do update set name = excluded.name, type = excluded.type, size = excluded.size,
       data = excluded.data, chunks = excluded.chunks`,
    [rowId, key, name, type, size || null, rowData, chunks, me.name],
  );

  if (total === 1) {
    await put(id, data, 1);
  } else {
    await put(`${id}#${idx}`, data, 1);
    if (idx === 0) await put(id, '', total);
  }
  return NextResponse.json({ ok: true, id, idx, total });
}
