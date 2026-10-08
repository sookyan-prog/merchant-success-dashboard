import { db } from './db';

/* Creates the tables/columns v45 needs if they are not there yet, once per
   server instance. Every statement is idempotent, so running it on a database
   that already has them (migrations 012 and 013 applied by hand) does nothing.
   It exists so that deploying the code before running the SQL does not break
   health checks and recordings - the manual migrations are still included for
   anyone who prefers to run them. */
let done = null;
export function ensureSchema() {
  if (!done) {
    done = (async () => {
      const q = (sql) => db().query(sql);
      await q(`create table if not exists notifications (id uuid primary key, data jsonb not null, updated_at timestamptz not null default now())`);
      await q(`create table if not exists bhc (id text primary key, data jsonb not null, updated_at timestamptz not null default now())`);
      await q(`alter table call_recordings add column if not exists status text not null default 'attached'`);
      await q(`alter table call_recordings add column if not exists merchant text`);
      await q(`alter table call_recordings add column if not exists docs jsonb not null default '[]'::jsonb`);
      await q(`alter table call_recordings add column if not exists submitted_at timestamptz`);
      await q(`alter table call_recordings add column if not exists reviewed_by text`);
      await q(`alter table call_recordings add column if not exists reviewed_at timestamptz`);
      await q(`alter table call_recordings add column if not exists review_note text`);
      await q(`create table if not exists recording_files (id text primary key, rec_key text not null, name text not null, type text not null, size integer, data text not null, uploaded_by text, created_at timestamptz not null default now())`);
      await q(`alter table recording_files add column if not exists chunks integer not null default 1`);
      await q(`create index if not exists recording_files_rec_key on recording_files (rec_key)`);
    })().catch((e) => { done = null; throw e; });
  }
  return done;
}
