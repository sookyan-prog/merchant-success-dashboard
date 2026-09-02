-- Churn queue merchant data, one row per store per month, refreshed by
-- pasting the console's "Churn Stores" report copy-table output into
-- /admin/churn-data instead of hand-editing the AUG_DATA array in
-- dashboard.html. The console report is scoped to a single month at a
-- time, so month is not in the copied text itself - it's picked on the
-- import page (defaults to the current month) and stored alongside each
-- row rather than parsed out of the paste.
create table if not exists churn_stores (
  month text not null,             -- 'YYYY-MM'
  store_id text not null,
  store_name text,
  country text,
  email text,
  phone text,
  cancel_reason text,
  plan text,
  cycle integer,
  gr numeric,
  mrr numeric,
  expiry_date date,
  updated_at timestamptz not null default now(),
  primary key (month, store_id)
);

-- Only the current and previous month are ever shown on the churn queue,
-- so nothing needs seeding here the way console_retention was - the first
-- paste into /admin/churn-data populates this from scratch.
