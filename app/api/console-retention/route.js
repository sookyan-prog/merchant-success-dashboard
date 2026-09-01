import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../lib/auth';

/* Any signed-in account manager can read this - it's what Reports/Overview
   and the campaign target card render from. Only managers can write to it
   (see ./import/route.js). */
export async function GET() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const { rows } = await db().query(
    `select month, mrr_net, mrr_net_pct, mrr_churn, mrr_retain,
            store_net, store_net_pct, store_churn, store_retain,
            total_store, total_mrr, gross_rev, retention_gr, updated_at
       from console_retention
      order by month desc`,
  );
  const data = rows.map((r) => ({
    month: r.month,
    mrrNet: Number(r.mrr_net),
    mrrNetPct: Number(r.mrr_net_pct),
    mrrChurn: Number(r.mrr_churn),
    mrrRetain: Number(r.mrr_retain),
    storeNet: Number(r.store_net),
    storeNetPct: Number(r.store_net_pct),
    storeChurn: Number(r.store_churn),
    storeRetain: Number(r.store_retain),
    totalStore: Number(r.total_store),
    totalMrr: Number(r.total_mrr),
    grossRev: Number(r.gross_rev),
    retentionGr: Number(r.retention_gr),
    updatedAt: r.updated_at,
  }));
  return NextResponse.json({ rows: data });
}
