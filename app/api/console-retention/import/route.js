import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '../../../../lib/db';
import { verifySession, SESSION_COOKIE } from '../../../../lib/auth';
import { parseConsoleRetentionPaste } from '../../../../lib/consoleRetentionParser';

async function requireManager() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const payload = token ? await verifySession(token) : null;
  if (!payload || payload.role !== 'manager') return null;
  return payload;
}

/* Manager-only: paste the console's "copy table" output here and every
   month it contains gets parsed and upserted, no HTML edit or redeploy
   needed. A one-day paste (just the current month) works the same as a
   full multi-year paste - each row is matched and written independently
   by its own "YYYY-MM" key. */
export async function POST(req) {
  const me = await requireManager();
  if (!me) return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.raw || '');
  if (!raw.trim()) {
    return NextResponse.json({ error: 'Paste the console table first.' }, { status: 400 });
  }

  const rows = parseConsoleRetentionPaste(raw);
  if (!rows.length) {
    return NextResponse.json(
      { error: "Could not find any month rows in that paste - check it's the full copy from the console table." },
      { status: 400 },
    );
  }

  const written = [];
  for (const r of rows) {
    // A row with nothing usable (retentionGr missing) isn't worth writing
    // over whatever's already stored for that month.
    if (r.retentionGr == null) continue;
    await db().query(
      `insert into console_retention
         (month, mrr_net, mrr_net_pct, mrr_churn, mrr_retain, store_net, store_net_pct,
          store_churn, store_retain, total_store, total_mrr, gross_rev, retention_gr, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       on conflict (month) do update set
         mrr_net = excluded.mrr_net, mrr_net_pct = excluded.mrr_net_pct,
         mrr_churn = excluded.mrr_churn, mrr_retain = excluded.mrr_retain,
         store_net = excluded.store_net, store_net_pct = excluded.store_net_pct,
         store_churn = excluded.store_churn, store_retain = excluded.store_retain,
         total_store = excluded.total_store, total_mrr = excluded.total_mrr,
         gross_rev = excluded.gross_rev, retention_gr = excluded.retention_gr,
         updated_at = now()`,
      [
        r.month, r.mrrNet, r.mrrNetPct, r.mrrChurn, r.mrrRetain, r.storeNet, r.storeNetPct,
        r.storeChurn, r.storeRetain, r.totalStore, r.totalMrr, r.grossRev, r.retentionGr,
      ],
    );
    written.push(r.month);
  }

  return NextResponse.json({ months: written });
}
