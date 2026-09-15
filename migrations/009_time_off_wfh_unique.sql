-- A double-click on Save, or a resubmit after the first response never made
-- it back to the browser, could create two identical "Work from home" rows
-- for the same person on the same day - the client-side clash check only
-- catches this if its local cache already has the first row, which it might
-- not yet. This makes it impossible at the database level: at most one
-- Work from home row per person per from_date. Annual leave and other types
-- are untouched (a person can still have overlapping rows of a different
-- type on the same day if that's ever needed).
--
-- Already run live in the Neon SQL editor on 2026-09-15 after cleaning up
-- three pre-existing duplicate pairs (Amira Liyana 2026-09-14, Kian Ming
-- 2026-09-09, Calvin Choo 2026-10-05). This file is the record of that.
create unique index if not exists time_off_wfh_one_per_day
  on time_off (person, from_date)
  where type = 'Work from home';
