-- Run this once in Neon's SQL editor before /api/campaign-activities,
-- /api/campaign-contacts and /api/escalations will work.
--
-- Campaign activities, campaign contact overrides, and Escalations all used
-- to live entirely in each person's own browser (localStorage). These three
-- tables are the shared home for them.
--
-- campaign_activities and escalations store each row's full record as a
-- jsonb blob rather than one column per field - both have many fields
-- (campaign activities especially: per-day schedule tracking, webinar
-- lists, multi-language message variants) and the client already generates
-- a complete, self-contained row (its own ID included) before saving, so
-- storing that row exactly as-is avoids a second, easy-to-drift mapping
-- between the client's shape and the database's. campaign_contacts is a
-- single shared lookup object (store ID -> phone/email overrides), not a
-- list of independent rows, so it gets one singleton row instead.

create table if not exists campaign_activities (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists escalations (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists campaign_contacts (
  id text primary key default 'singleton',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
