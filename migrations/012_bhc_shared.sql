-- Run this once in Neon's SQL editor before /api/bhc will work.
--
-- Business Health Check sessions used to live only in each person's own
-- browser (localStorage), which is why George Sim could see his 4 September
-- sessions on his own screen while the manager, on hers, saw a different
-- one: each browser held its own private copy. This table is the shared
-- home for them.
--
-- One row per session, stored as a jsonb blob exactly as the dashboard
-- builds it (the record has a lot of nested fields: scores, findings,
-- channels, research notes), keyed by the record's own ID. The id is text,
-- not uuid, because older records carry IDs that are not uuid-shaped.

create table if not exists bhc (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
