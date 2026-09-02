import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

/* Any signed-in account manager can read this - it's what the churn queue
   on My day renders instead of the hardcoded AUG_DATA array. Only managers
   can write to it (see ./import/route.js). Returns every stored month; the
   dashboard itself decides to only use current + previous month. */
export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query(
    `select month, store_id, store_name, country, email, phone, cancel_reason,
            plan, cycle, gr, mrr, expiry_date, updated_at
       from churn_stores
      order by month desc, expiry_date desc`,
  );
  const data = rows.map((r) => ({
    month: r.month,
    storeId: r.store_id,
    storeName: r.store_name,
    country: r.country,
    email: r.email,
    phone: r.phone,
    cancelReason: r.cancel_reason,
    plan: r.plan,
    cycle: r.cycle == null ? null : Number(r.cycle),
    gr: Number(r.gr),
    mrr: Number(r.mrr),
    expiryDate: r.expiry_date,
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ rows: data });
}
