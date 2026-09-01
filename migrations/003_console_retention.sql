-- Console retention data, one row per month, refreshed by pasting the
-- console's "copy table" output into /admin/console-data instead of
-- editing the dashboard's HTML by hand.
create table if not exists console_retention (
  month text primary key,              -- 'YYYY-MM'
  mrr_net numeric,
  mrr_net_pct numeric,
  mrr_churn numeric,
  mrr_retain numeric,
  store_net numeric,
  store_net_pct numeric,
  store_churn numeric,
  store_retain numeric,
  total_store numeric,
  total_mrr numeric,
  gross_rev numeric,
  retention_gr numeric,
  updated_at timestamptz not null default now()
);

-- Seed with the figures that were previously hardcoded in dashboard.html
-- (console read 26 Aug 2026), so nothing is lost on the switch-over. A
-- fresh paste from the console will overwrite these as SookYan updates.
insert into console_retention
  (month, mrr_net, mrr_net_pct, mrr_churn, mrr_retain, store_net, store_net_pct, store_churn, store_retain, total_store, total_mrr, gross_rev, retention_gr)
values
  ('2026-08', -15189, -2.4, -27555, 12365,  -92, -3.4, -126, 34, 2672, 632939, 529489, 402891),
  ('2026-07',  -4794, -0.8, -24467, 19673,  -72, -2.6, -117, 45, 2716, 632996, 739761, 554631),
  ('2026-06', -13230, -2.1, -31916, 18687,  -78, -2.8, -140, 62, 2727, 617721, 678362, 524457),
  ('2026-05', -23983, -3.8, -38449, 14467, -113, -4.0, -160, 47, 2757, 617411, 593233, 466896),
  ('2026-04', -18553, -2.9, -32016, 13463,  -92, -3.2, -130, 38, 2833, 632763, 498798, 381595),
  ('2026-03', -21139, -3.3, -30924,  9786,  -82, -2.8, -121, 39, 2875, 636894, 693654, 555396),
  ('2026-02', -18326, -2.8, -36888, 18562,  -91, -3.1, -136, 45, 2920, 646253, 560132, 425259),
  ('2026-01', -17344, -2.7, -32101, 14757,  -74, -2.5, -132, 58, 2969, 649096, 542052, 383428),
  ('2025-12',  -1502, -0.2, -23586, 22083,  -64, -2.1, -114, 50, 2987, 649004, 635150, 484495),
  ('2025-11', -12819, -2.0, -27521, 14702,  -81, -2.7, -119, 38, 3002, 634960, 581506, 399760),
  ('2025-10', -21401, -3.4, -36660, 15259, -114, -3.7, -163, 49, 3022, 628433, 686705, 492460),
  ('2025-09', -18892, -3.0, -31219, 12327,  -99, -3.2, -134, 35, 3075, 633195, 687397, 442764)
on conflict (month) do nothing;
