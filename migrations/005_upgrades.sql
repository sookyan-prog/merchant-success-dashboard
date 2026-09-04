-- Run this once in Neon's SQL editor before /api/upgrades will work.
--
-- The Upgrade pipeline used to live entirely in each account manager's own
-- browser (localStorage), which is why opportunities one AM added never
-- showed up for anyone else, including a manager checking from her own
-- machine. This table is the shared home for it - every row an AM adds,
-- edits, or ticks a follow-up on writes here instead, so everyone sees the
-- same book.

create table if not exists upgrades (
  id uuid primary key default gen_random_uuid(),
  merchant text not null,
  store_id text,
  am text not null,
  stage text not null default 'identified',
  closing_date date,
  value numeric,
  mrr numeric,
  cycle text,
  reason text,
  plan_from text,
  plan_to text,
  phone text,
  f1 boolean not null default false,
  f2 boolean not null default false,
  f3 boolean not null default false,
  filed date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists upgrades_am_idx on upgrades (am);
create index if not exists upgrades_stage_idx on upgrades (stage);
