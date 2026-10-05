import { Pool, types } from 'pg';

/* pg's default behaviour for a Postgres "date" column (OID 1082, used by
   upgrades.closing_date/filed and time_off.from_date/to_date) is to parse
   it into a JS Date - fine inside Node, but NextResponse.json() then
   serialises that Date with JSON.stringify(), which calls toISOString()
   and turns a clean "2026-09-18" into "2026-09-18T00:00:00.000Z". Every
   date-range check in dashboard.html (whoIsOut, whoIsWFH, the Time off
   calendar's own shading, upMonth()) compares plain 'YYYY-MM-DD' strings,
   and a same-day string compares as LESS than that same day with a time
   suffix appended (a prefix always sorts before the longer string it's a
   prefix of) - so a booking's own From date could fail its own
   From <= day <= To check and never shade on the calendar, despite
   showing correctly, timestamp and all, in the plain-text Bookings table.
   Registering this parser keeps a "date" column exactly as the
   'YYYY-MM-DD' string Postgres sends, so it round-trips unchanged. */
types.setTypeParser(1082, (val) => val);

/* The Neon integration adds its own env var name depending on whatever
   custom prefix was set when it was connected. In this project that ended
   up as the lowercase "neon_" prefix (neon_DATABASE_URL), not "NEON_" -
   env var names are case-sensitive, so both cases are checked here to
   avoid re-breaking this if the prefix casing ever changes again. A plain
   DATABASE_URL is checked last, not first: an old, stale DATABASE_URL from
   before the integration was installed sat alongside the new prefixed ones
   and silently won every time, since it was checked first previously. */
const CONNECTION_STRING =
  process.env.neon_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  // Thrown at request time (not at import time / build time) so the app
  // still builds even before the env var is set in Vercel.
  console.warn('No database connection string found in the environment yet.');
}

let pool;
export function db() {
  if (!pool) {
    pool = new Pool({
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false },
      /* None of these were set before, so a slow-to-wake Neon compute (it
         suspends after inactivity and takes a moment to resume) or a
         transient network blip meant a query just hung with no error and
         no way for the page to tell the difference from "still working" -
         "it just keeps loading" with nothing ever surfacing, on the console
         data import and plausibly behind general dashboard slowness too.
         Failing fast with a clear error, instead of hanging indefinitely,
         is strictly better even though none of these numbers are exact
         science: a real wait is still a few seconds, not instant. */
      connectionTimeoutMillis: 10000, // give up trying to connect after 10s
      statement_timeout: 20000, // give up on a single query after 20s
      idleTimeoutMillis: 30000, // let an unused connection close rather than pile up
    });
    /* An idle client in the pool can still drop (Neon closing it server-side,
       a network blip) - without this handler that surfaces as an unhandled
       'error' event and can crash the whole function instead of just that
       one query failing. */
    pool.on('error', (err) => {
      console.error('Unexpected error on idle database client', err);
    });
  }
  return pool;
}
