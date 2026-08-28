import { Pool } from 'pg';

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
    });
  }
  return pool;
}
