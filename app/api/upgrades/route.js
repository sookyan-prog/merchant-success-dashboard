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

/* Any signed-in account manager can read the whole book - this is the shared
   home for the Upgrade pipeline. It used to live only in each person's own
   browser (localStorage), which is why one AM's opportunities never showed
   up for anyone else, including a manager on her own machine. The dashboard
   still filters this down to "my book" client-side for a non-manager, same
   as it always has; only the storage moved. */
export async function GET() {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query(
    `select id, merchant, store_id, am, stage, closing_date, value, mrr, cycle,
            reason, plan_from, plan_to, phone, f1, f2, f3, filed, notes,
            created_at, updated_at
       from upgrades
      order by created_at desc`,
  );
  return NextResponse.json({ rows: rows.map(shapeRow) });
}

/* Any signed-in account manager can add an opportunity - not manager-only,
   since this is each AM's own book. A non-manager's row is always filed
   under their own name server-side, regardless of what the client sends:
   that closes off the exact bug that prompted this table (a browser-only
   name alias meant an AM's new opportunity could silently save under a
   colleague's name and vanish from their own view). Only a manager's
   request is allowed to name a different owner, for filing on someone
   else's behalf. */
export async function POST(req) {
  const me = await requireUser();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const merchant = String(body.merchant || '').trim();
  if (!merchant) return NextResponse.json({ error: 'Which merchant is this for?' }, { status: 400 });

  const am = me.role === 'manager' && body.am ? String(body.am).trim() : me.name;
  const stage = body.stage || 'identified';

  const { rows } = await db().query(
    `insert into upgrades
       (merchant, store_id, am, stage, closing_date, value, mrr, cycle, reason,
        plan_from, plan_to, phone, f1, f2, f3, filed, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,coalesce($16,current_date),$17)
     returning id, merchant, store_id, am, stage, closing_date, value, mrr, cycle,
               reason, plan_from, plan_to, phone, f1, f2, f3, filed, notes,
               created_at, updated_at`,
    [
      merchant,
      body.storeId || null,
      am,
      stage,
      body.closingDate || null,
      body.value == null || body.value === '' ? null : Number(body.value),
      body.mrr == null || body.mrr === '' ? null : Number(body.mrr),
      body.cycle || null,
      body.reason || null,
      body.planFrom || null,
      body.planTo || null,
      body.phone || null,
      !!body.f1,
      !!body.f2,
      !!body.f3,
      body.filed || null,
      body.notes || null,
    ],
  );
  return NextResponse.json({ row: shapeRow(rows[0]) }, { status: 201 });
}
