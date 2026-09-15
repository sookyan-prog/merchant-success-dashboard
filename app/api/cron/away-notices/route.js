import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';

/* This is deliberately NOT under /api/time-off/ (which middleware.js
   requires a signed-in session for) - a scheduled job has no browser and
   no session cookie, so it lives on its own path with its own check
   below, the same way /api/auth/login is left out of the matcher for the
   same reason.

   What this does: once a day, find every non-Work-from-home booking that
   starts within the next 2 days and hasn't been announced yet, post a
   short "heads up, X is away soon" message to the team's Slack channel,
   then mark it sent so it never posts twice. "Within 2 days" rather than
   "exactly 2 days" on purpose - Emergency leave in particular is often
   booked with a day's notice or less, and a strict "exactly 2 days
   before" check would silently never catch a booking like that.

   Two things have to exist in Vercel's Project Settings -> Environment
   Variables for this to do anything:
     CRON_SECRET             a random string only this job's caller knows
     SLACK_AWAY_WEBHOOK_URL  an incoming webhook for #my-team-retentionandgrowth
   Without SLACK_AWAY_WEBHOOK_URL this still runs and still marks rows as
   sent-if-it-had-run, so nothing queues up silently once the webhook is
   added - it just cannot actually post until then, and says so in the
   response. */

function checkSecret(req) {
  const want = process.env.CRON_SECRET;
  if (!want) return false;
  const got = req.headers.get('x-cron-secret');
  return got === want;
}

/* Malaysia is UTC+8 with no daylight saving, so this is a fixed offset,
   not a real timezone conversion - good enough for "which calendar date
   is it right now in Malaysia" without pulling in a timezone library for
   one call site. */
function myTodayKey() {
  const now = new Date();
  const my = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return my.toISOString().slice(0, 10);
}
function addDays(dateKey, n) {
  const d = new Date(dateKey + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function dLong(dateKey) {
  const d = new Date(dateKey + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function coverLabel(covers) {
  if (!Array.isArray(covers) || !covers.length) return '';
  return covers.map(c => (c.Channel ? `${c.Person} (${c.Channel})` : c.Person)).join(', ');
}
function awayMessage(row) {
  const from = dLong(row.from_date), to = dLong(row.to_date);
  const when = row.from_date === row.to_date ? `on ${from}` : `from ${from} to ${to}`;
  const cover = coverLabel(row.covers);
  return [
    `*Heads up: ${row.person} will be away ${when}* · ${row.type}`,
    cover ? `Covering: *${cover}*` : `No cover named yet - worth checking with ${row.person}.`,
    row.note ? `_${row.note}_` : null,
  ].filter(Boolean).join('\n');
}

async function run(req) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const today = myTodayKey();
  const cutoff = addDays(today, 2);
  const { rows } = await db().query(
    `select id, person, type, from_date, to_date, covers, note
       from time_off
      where type <> 'Work from home'
        and from_date >= $1
        and from_date <= $2
        and away_notice_sent_at is null
      order by from_date`,
    [today, cutoff],
  );

  const webhook = (process.env.SLACK_AWAY_WEBHOOK_URL || '').trim();
  let sent = 0, failed = 0;
  const skippedNoWebhook = !webhook && rows.length > 0;

  for (const row of rows) {
    if (!webhook) continue; // leave away_notice_sent_at null - nothing to mark sent, nothing lost
    try {
      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: awayMessage(row) }),
      });
      if (res.ok) {
        await db().query('update time_off set away_notice_sent_at = now() where id = $1', [row.id]);
        sent++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  return NextResponse.json({
    checked: rows.length,
    sent,
    failed,
    skippedNoWebhook,
    note: skippedNoWebhook ? 'SLACK_AWAY_WEBHOOK_URL is not set yet - nothing was posted, and nothing was marked sent.' : undefined,
  });
}

export async function POST(req) { return run(req); }
export async function GET(req) { return run(req); }
