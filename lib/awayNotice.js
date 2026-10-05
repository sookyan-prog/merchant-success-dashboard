/* Shared by both away-notice paths:
     - the daily cron (app/api/cron/away-notices/route.js), which catches
       everything booked 3 or fewer days out
     - the immediate send for Emergency leave (app/api/time-off/route.js),
       which fires the moment the booking is saved rather than waiting for
       the next scheduled run, since emergency leave is often same-day
   Pulled out here so both build the exact same message and post it the
   same way, rather than drifting apart over time.

   Covering a teammate at every row: a Slack *text* mention only pings
   someone if it is written as the special <@MEMBER_ID> form - plain text
   like "@Amira Liyana" just prints literally and nobody gets notified. That
   member ID is not the same as a name and is not visible anywhere in this
   app already, so it has to be entered once per person below. Open the
   person's profile in Slack -> the "..." (more) menu -> Copy member ID, and
   paste it in as the value. Anyone left blank still gets named in the
   message, just without an actual ping, so nothing breaks before this list
   is filled in. */
const SLACK_USER_IDS = {
  'Amira Liyana': 'U0AHEATUYBH',
  'Astrid Chen': 'U7SH3D63T',
  'Calvin Choo': 'U016MLMPRBR',
  'Cavan Koh': 'U075A84KDJB',
  'Choo Zhe Hong': 'U016MLMPRBR',
  'George Sim': 'U0956ME2E87',
  'Isabelle Wong': '',
  'Khor June Yih': '',
  'Kian Ming': 'U0956ME2E87',
  'Sook Yan': 'U6JV2G4G4',
  'Tan Ye': 'U029T4Y0S7M',
};

function slackTag(person) {
  const id = (SLACK_USER_IDS[person] || '').trim();
  return id ? `<@${id}>` : person;
}

function dLong(dateKey) {
  const d = new Date(dateKey + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/* Covers used to just be named in plain text, e.g. "Covering: Amira Liyana
   (WhatsApp)" - which nobody actually saw unless they happened to be
   reading the channel right then. Tagging means it also lands in their
   Slack notifications/mentions, which is the point of naming a cover at
   all. */
function coverLabel(covers) {
  if (!Array.isArray(covers) || !covers.length) return '';
  return covers.map((c) => (c.Channel ? `${slackTag(c.Person)} (${c.Channel})` : slackTag(c.Person))).join(', ');
}

function awayMessage(row) {
  const from = dLong(row.from_date), to = dLong(row.to_date);
  const when = row.from_date === row.to_date ? `on ${from}` : `from ${from} to ${to}`;
  const cover = coverLabel(row.covers);
  const urgent = row.type === 'Emergency leave';
  return [
    `${urgent ? ':rotating_light: ' : ''}*Heads up: ${row.person} will be away ${when}* · ${row.type}`,
    cover ? `Covering: ${cover}` : `No cover named yet - worth checking with ${row.person}.`,
    row.note ? `_${row.note}_` : null,
  ].filter(Boolean).join('\n');
}

/* Fire-and-report, not fire-and-forget - the caller needs the boolean to
   decide whether to stamp away_notice_sent_at, same as the cron always did.
   No webhook configured is treated as "did not send" rather than an error,
   so callers that currently treat sent-is-false as "leave it for the cron
   to retry" keep working unchanged. */
async function postAwayNotice(row) {
  const webhook = (process.env.SLACK_AWAY_WEBHOOK_URL || '').trim();
  if (!webhook) {
    console.error('[away-notice] SLACK_AWAY_WEBHOOK_URL is not set on this deployment - nothing posted.');
    return false;
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: awayMessage(row) }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[away-notice] Slack rejected the post:', res.status, detail);
    }
    return res.ok;
  } catch (e) {
    console.error('[away-notice] Could not reach Slack:', e && e.message);
    return false;
  }
}

export { SLACK_USER_IDS, slackTag, awayMessage, postAwayNotice };
