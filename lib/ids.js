import { createHash } from 'crypto';

/* The dashboard used to generate row IDs like "muup133shrir6iip657" (a
   timestamp + random string), but campaign_activities, escalations and
   notifications have a uuid primary key. Postgres rejects anything that
   is not uuid-shaped, and because each sync runs as one transaction, ONE
   bad ID rolled back the whole save - so the change looked fine on screen
   and then silently never reached the shared copy.
   A real uuid passes through untouched. Anything else is mapped to a
   uuid-shaped value derived from the original text, the same input always
   giving the same output, so a row keeps one stable identity and the
   "delete everything not in this list" step still lines up. The row's own
   ID inside its jsonb blob is left as-is, so the browser never sees a
   different ID than the one it made. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function toUuid(id) {
  const s = String(id);
  if (UUID_RE.test(s)) return s.toLowerCase();
  const h = createHash('md5').update(s).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
