-- Run this once in Neon's SQL editor before /api/notifications will work.
--
-- Notifications used to live entirely in each person's own browser
-- (localStorage, key ret2_notifications) - so when a manager sent one
-- (naming a cover for time off, sending a claim back, or now, changing the
-- stage/owner on someone else's Upgrade opportunity), it only ever showed
-- up in the bell on the manager's own device. The AM it was addressed to
-- never saw it, because it never left the browser that wrote it.
--
-- Same shared-jsonb-blob, full-replace-sync pattern as campaign_activities
-- and escalations (see 007_campaign_and_escalations.sql) - the client
-- already builds a complete, self-contained row (its own ID, the "To"
-- name, text, link, timestamp, read flag) before saving.

create table if not exists notifications (
  id uuid primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
