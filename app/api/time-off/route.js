import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

async function requireUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return token ? await verifySession(token) : null;
}

function shapeRow(r) {
  return {
    id: r.id,
    person: r.person,
    type: r.type,
    fromDate: r.from_date,
    toDate: r.to_date,
    covers: r.covers || [],
    note: r.note,
    slack: r.slack,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/* Any signed-in account manager can read the whole calendar - this is the
   shared home for Time off/work-from-home, which used to live only in each
   person's own browser (localStorage), so a teammate's booking never
   showed up on anyone else's screen, manager included. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query(
    `select id, person, type, from_date, to_date, covers, note, slack,
            created_at, updated_at
       from time_off
      order by from_date desc`,
  );
  return NextResponse.json({ rows: rows.map(shapeRow) });
}

/* Any signed-in account manager can book their own time off - not
   manager-only. A non-manager's row is always booked under their own name
   server-side, regardless of what the client sends: booking someone else's
   leave is how a day empties without its owner knowing, so only a
   manager's request may name a different person (booking on someone's
   behalf). */
export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const type = String(body.type || '').trim();
  const fromDate = body.fromDate;
  const toDate = body.toDate || fromDate;
  if (!type || !fromDate) {
    return NextResponse.json({ error: 'Pick a type and date first.' }, { status: 400 });
  }

  const person = me.role === 'manager' && body.person ? String(body.person).trim() : me.name;

  const { rows } = await db().query(
    `insert into time_off (person, type, from_date, to_date, covers, note, slack)
     values ($1,$2,$3,$4,$5,$6,$7)
     returning id, person, type, from_date, to_date, covers, note, slack,
               created_at, updated_at`,
    [
      person,
      type,
      fromDate,
      toDate,
      JSON.stringify(body.covers || []),
      body.note || null,
      body.slack || null,
    ],
  );
  return NextResponse.json({ row: shapeRow(rows[0]) }, { status: 201 });
}
