-- Run this once in Neon's SQL editor before /api/time-off will work.
--
-- Time off (annual leave, work-from-home, etc.) used to live entirely in
-- each person's own browser (localStorage), which is why a teammate's
-- work-from-home day or leave booking never showed up on anyone else's
-- screen, manager included. This table is the shared home for it.

create table if not exists time_off (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  type text not null,
  from_date date not null,
  to_date date not null,
  covers jsonb not null default '[]'::jsonb,
  note text,
  slack text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists time_off_person_idx on time_off (person);
create index if not exists time_off_dates_idx on time_off (from_date, to_date);
