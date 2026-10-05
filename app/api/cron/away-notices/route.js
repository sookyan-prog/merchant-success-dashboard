import { NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { postAwayNotice } from '../../../../lib/awayNotice';

/* This is deliberately NOT under /api/time-off/ (which middleware.js
   requires a signed-in session for) - a scheduled job has no browser and
   no session cookie, so it lives on its own path with its own check
   below, the same way /api/auth/login is left out of the matcher for the
   same reason.

   What this does: once a day, find every non-Work-from-home booking that
   starts within the next 3 days and hasn't been announced yet, post a
   short "heads up, X is away soon" message to the team's Slack channel,
   then mark it sent so it never posts twice. "Within 3 days" rather than
   "exactly 3 days" on purpose - leave is often booked with only a day or
   two's notice, and a strict "exactly 3 days before" check would silently
   never catch a booking like that.

   Emergency leave does not wait for this at all - see
   app/api/time-off/route.js, which posts (and stamps away_notice_sent_at)
   the moment the booking is saved, since emergency leave is often same-day
   and 3 days is already too slow for it. This cron is still the backstop
   for it too: if that immediate send fails for any reason,
   away_notice_sent_at stays null and this picks it up on the next run like
   anything else.

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

const NOTICE_WINDOW_DAYS = 3;

async function run(req) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const today = myTodayKey();
  const cutoff = addDays(today, NOTICE_WINDOW_DAYS);
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
    const ok = await postAwayNotice(row);
    if (ok) {
      await db().query('update time_off set away_notice_sent_at = now() where id = $1', [row.id]);
      sent++;
    } else {
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
