-- Optional display title for completed planned task (overrides planned_tasks.title in UI)
alter table public.timer_records
  add column if not exists completed_plan_title text;
