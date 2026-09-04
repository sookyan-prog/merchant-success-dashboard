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
    merchant: r.merchant,
    storeId: r.store_id,
    am: r.am,
    stage: r.stage,
    closingDate: r.closing_date,
    value: r.value == null ? null : Number(r.value),
    mrr: r.mrr == null ? null : Number(r.mrr),
    cycle: r.cycle,
    reason: r.reason,
    planFrom: r.plan_from,
    planTo: r.plan_to,
    phone: r.phone,
    f1: r.f1,
    f2: r.f2,
    f3: r.f3,
    filed: r.filed,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const COLUMNS = {
  merchant: 'merchant',
  storeId: 'store_id',
  stage: 'stage',
  closingDate: 'closing_date',
  value: 'value',
  mrr: 'mrr',
  cycle: 'cycle',
  reason: 'reason',
  planFrom: 'plan_from',
  planTo: 'plan_to',
  phone: 'phone',
  f1: 'f1',
  f2: 'f2',
  f3: 'f3',
  notes: 'notes',
};

/* Edits (the modal form, or a single follow-up checkbox tick) and stage
   moves. A non-manager may only touch their own rows, and - same rule as
   creating one - may never move a row onto someone else's name; only a
   manager's request can reassign "am". */
export async function PATCH(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows: existingRows } = await db().query('select am from upgrades where id = $1', [params.id]);
  if (!existingRows.length) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  if (me.role !== 'manager' && existingRows[0].am !== me.name) {
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
  if (me.role === 'manager' && Object.prototype.hasOwnProperty.call(body, 'am') && body.am) {
    sets.push(`am = $${i++}`);
    values.push(String(body.am).trim());
  }
  if (!sets.length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  sets.push(`updated_at = now()`);
  values.push(params.id);

  const { rows } = await db().query(
    `update upgrades set ${sets.join(', ')} where id = $${i} returning
       id, merchant, store_id, am, stage, closing_date, value, mrr, cycle,
       reason, plan_from, plan_to, phone, f1, f2, f3, filed, notes,
       created_at, updated_at`,
    values,
  );
  return NextResponse.json({ row: shapeRow(rows[0]) });
}

export async function DELETE(req, { params }) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows: existingRows } = await db().query('select am from upgrades where id = $1', [params.id]);
  if (!existingRows.length) return NextResponse.json({ ok: true });
  if (me.role !== 'manager' && existingRows[0].am !== me.name) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  await db().query('delete from upgrades where id = $1', [params.id]);
  return NextResponse.json({ ok: true });
}
