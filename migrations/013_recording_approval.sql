-- Run this once in Neon's SQL editor before deploying v45.
--
-- 1. Health check evidence is reviewed by the manager together with the
--    incentive claim. These columns hold where each piece of evidence
--    stands: 'attached' (saved, not yet reviewed), 'approved' or 'rejected'.
--    Rows that already exist become 'attached'.
-- 2. Evidence can now be a link, or an attached image, PDF, audio or video
--    file (up to 25 MB each). The files live in recording_files as base64
--    text, in pieces for the bigger ones, so a manager on another computer
--    can open them.

alter table call_recordings add column if not exists status text not null default 'attached';
alter table call_recordings add column if not exists merchant text;
alter table call_recordings add column if not exists docs jsonb not null default '[]'::jsonb;
alter table call_recordings add column if not exists submitted_at timestamptz;
alter table call_recordings add column if not exists reviewed_by text;
alter table call_recordings add column if not exists reviewed_at timestamptz;
alter table call_recordings add column if not exists review_note text;

create table if not exists recording_files (
  id text primary key,
  rec_key text not null,
  name text not null,
  type text not null,
  size integer,
  data text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);
alter table recording_files add column if not exists chunks integer not null default 1;
create index if not exists recording_files_rec_key on recording_files (rec_key);
