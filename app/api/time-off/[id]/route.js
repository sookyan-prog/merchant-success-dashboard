import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';

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

const COLUMNS = {
  type: 'type',
  fromDate: 'from_date',
  toDate: 'to_date',
  note: 'note',
  slack: 'slack',
};

/* Edits (changing dates/type/note, resending the Slack notice) and covers.
   A non-manager may only touch their own bookings, and - same rule as
   creating one - may never move a booking onto someone else's name; only a
   manager's request can reassign "person". */
export async function PATCH(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows: existingRows } = await db().query('select person from time_off where id = $1', [params.id]);
  if (!existingRows.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (me.role !== 'manager' && existingRows[0].person !== me.name) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, col] of Object.entries(COLUMNS)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${col} = $${i++}`);
      values.push(body[key] === '' ? null : body[key]);
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, 'covers')) {
    sets.push(`covers = $${i++}`);
    values.push(JSON.stringify(body.covers || []));
  }
  if (me.role === 'manager' && Object.prototype.hasOwnProperty.call(body, 'person') && body.person) {
    sets.push(`person = $${i++}`);
    values.push(String(body.person).trim());
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  sets.push(`updated_at = now()`);
  values.push(params.id);

  const { rows } = await db().query(
    `update time_off set ${sets.join(', ')} where id = $${i} returning
       id, person, type, from_date, to_date, covers, note, slack,
       created_at, updated_at`,
    values,
  );
  return NextResponse.json({ row: shapeRow(rows[0]) });
}

export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows: existingRows } = await db().query('select person from time_off where id = $1', [params.id]);
  if (!existingRows.length) return NextResponse.json({ ok: true });
  if (me.role !== 'manager' && existingRows[0].person !== me.name) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  await db().query('delete from time_off where id = $1', [params.id]);
  return NextResponse.json({ ok: true });
}
