-- Planned tasks are per calendar day (Moscow)
alter table public.planned_tasks
  add column if not exists plan_date date default (timezone('Europe/Moscow', now()))::date;

-- Backfill: set plan_date from created_at (Moscow) for existing rows
update public.planned_tasks
set plan_date = (timezone('Europe/Moscow', created_at))::date;

alter table public.planned_tasks
  alter column plan_date set not null,
  alter column plan_date set default (timezone('Europe/Moscow', now()))::date;

create index if not exists idx_planned_tasks_user_plan_date_sort
  on public.planned_tasks(user_id, plan_date, sort_order);
