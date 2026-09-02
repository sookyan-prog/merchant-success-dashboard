import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';
import { parseChurnStoresPaste } from '../../../../lib/churnStoresParser';

async function requireManager() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload || payload.role !== 'manager') return null;
  return payload;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

/* Manager-only: paste the console's Churn Stores "copy table" output here,
   pick which month it's for (the report itself is scoped to one month at a
   time and that scope isn't in the copied text), and every row gets
   parsed and upserted - same idea as /api/console-retention/import, just a
   different report shape. Re-importing the same month overwrites that
   month's rows only. */
export async function POST(req) {
  const me = await requireManager();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.raw || '');
  const month = String(body.month || '');
  if (!MONTH_RE.test(month)) {
    return NextResponse.json({ error: 'Pick a valid month (YYYY-MM) first.' }, { status: 400 });
  }
  if (!raw.trim()) {
    return NextResponse.json({ error: 'Paste the console table first.' }, { status: 400 });
  }

  const rows = parseChurnStoresPaste(raw, month);
  if (!rows.length) {
    return NextResponse.json(
      { error: "Could not find any store rows in that paste - check it's the full copy from the Churn Stores table." },
      { status: 400 },
    );
  }

  for (const r of rows) {
    await db().query(
      `insert into churn_stores
         (month, store_id, store_name, country, email, phone, cancel_reason, plan, cycle, gr, mrr, expiry_date, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())
       on conflict (month, store_id) do update set
         store_name = excluded.store_name, country = excluded.country,
         email = excluded.email, phone = excluded.phone,
         cancel_reason = excluded.cancel_reason, plan = excluded.plan, cycle = excluded.cycle,
         gr = excluded.gr, mrr = excluded.mrr, expiry_date = excluded.expiry_date,
         updated_at = now()`,
      [r.month, r.storeId, r.storeName, r.country, r.email, r.phone, r.cancelReason, r.plan, r.cycle, r.gr, r.mrr, r.expiryDate],
    );
  }

  return NextResponse.json({ month, count: rows.length });
}
