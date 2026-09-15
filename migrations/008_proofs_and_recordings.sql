-- Run this once in Neon's SQL editor before /api/proofs and
-- /api/call-recordings will work.
--
-- Proof-of-contact screenshots and call-recording details both used to live
-- only in each person's own browser (localStorage), so a manager checking
-- Team files saw nothing until someone exported a file and sent it over by
-- hand. These two tables are the shared home for them.
--
-- "id" is a business key, not a generated one - the same string the app
-- already uses to address a proof or recording (a merchant/opportunity ID,
-- or "hc-<store id>" for a health check), so it stays one row per key,
-- upserted in place, matching how the client already only ever touches one
-- key at a time (attach, replace, or remove a single proof/recording).
--
-- The actual recording audio/video file is NOT stored here and does not
-- move to the database - it stays in IndexedDB in whichever browser
-- uploaded it, same as before ("Files are kept in this browser... a shared
-- link is still how a colleague gets to one"). Only the recording's
-- details - file name, size, duration, the optional link, the note - are
-- shared, so everyone can at least see what exists and read the summary,
-- even if only the uploader's own browser can play the file itself.

create table if not exists proofs (
  id text primary key,
  data text not null,
  at timestamptz,
  by text,
  updated_at timestamptz not null default now()
);

create table if not exists call_recordings (
  id text primary key,
  url text,
  note text,
  at timestamptz,
  by text,
  files jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
