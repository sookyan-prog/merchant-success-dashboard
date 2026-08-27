import { Pool } from 'pg';

/* The Neon integration adds its own env var name depending on whatever
   custom prefix was set when it was connected (e.g. NEON_DATABASE_URL).
   Checking a short list means the code doesn't break if that prefix ever
   changes, instead of hard-coding one exact name. */
const CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_DATABASE_URL;

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
