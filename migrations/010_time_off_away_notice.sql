-- Tracks whether the automatic "away in 2 days" Slack reminder has already
-- gone out for a booking, so the daily cron job (see /api/cron/away-notices)
-- never posts the same reminder twice. Null means not sent yet.
alter table time_off add column if not exists away_notice_sent_at timestamptz;
