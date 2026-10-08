import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { ensureSchema } from '../../../lib/ensureSchema';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

const COLS = 'id, url, note, at, by, files, merchant, docs, status, submitted_at, reviewed_by, reviewed_at, review_note, updated_at';

function shapeRow(r) {
  return {
    id: r.id, url: r.url, note: r.note, at: r.at, by: r.by, files: r.files || [],
    merchant: r.merchant, docs: r.docs || [], status: (!r.status || r.status === 'pending') ? 'attached' : r.status,
    submittedAt: r.submitted_at, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, reviewNote: r.review_note,
    updatedAt: r.updated_at,
  };
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
  await ensureSchema();

  const { rows } = await db().query(`select ${COLS} from call_recordings`);
  return NextResponse.json({ rows: rows.map(shapeRow) });
}

export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  await ensureSchema();

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || '').trim();
  if (!id) return NextResponse.json({ error: 'Missing the recording id.' }, { status: 400 });

  /* Whether a recording counts towards the incentive is the manager's call
     alone. Anyone else saving evidence - a new link, an extra file, an edited
     note - always leaves it "attached" (not yet reviewed), whatever the
     browser sent, so an account manager cannot mark their own evidence
     approved. */
  const isMgr = me.role === 'manager';
  let status = 'attached', reviewedBy = null, reviewedAt = null, reviewNote = null;
  if (isMgr && ['approved', 'rejected', 'attached'].includes(body.status)) {
    status = body.status;
    if (status !== 'attached') {
      reviewedBy = body.reviewedBy || me.name;
      reviewedAt = body.reviewedAt || new Date().toISOString();
      reviewNote = body.reviewNote || null;
    }
  }

  /* An older copy of the dashboard, still open in someone's browser, does not
     know about attachments or the review fields and would send none. Rather
     than let that blank them out, keep what is already stored. */
  const existing = (await db().query('select docs, merchant from call_recordings where id = $1', [id])).rows[0];
  const docs = Array.isArray(body.docs) ? body.docs : (existing && existing.docs) || [];
  const merchant = body.merchant !== undefined ? body.merchant : (existing && existing.merchant) || null;

  const { rows } = await db().query(
    `insert into call_recordings
       (id, url, note, at, by, files, merchant, docs, status, submitted_at, reviewed_by, reviewed_at, review_note, updated_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
     on conflict (id) do update set url = excluded.url, note = excluded.note, at = excluded.at,
       by = excluded.by, files = excluded.files, merchant = excluded.merchant, docs = excluded.docs,
       status = excluded.status, submitted_at = excluded.submitted_at, reviewed_by = excluded.reviewed_by,
       reviewed_at = excluded.reviewed_at, review_note = excluded.review_note, updated_at = now()
     returning ${COLS}`,
    [
      id, body.url || null, body.note || null, body.at || null, body.by || null,
      JSON.stringify(body.files || []), merchant || null, JSON.stringify(docs),
      status, body.submittedAt || null, reviewedBy, reviewedAt, reviewNote,
    ],
  );
  return NextResponse.json({ row: shapeRow(rows[0]) });
}
