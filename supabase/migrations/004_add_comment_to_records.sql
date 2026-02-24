-- Add comment field to timer_records
alter table public.timer_records
  add column if not exists comment text;
