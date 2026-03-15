-- Planned tasks (user's todo list with optional planned time and category)
create table if not exists public.planned_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  planned_minutes integer check (planned_minutes is null or planned_minutes > 0),
  category_id uuid references public.timer_categories(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_planned_tasks_user_id on public.planned_tasks(user_id);
create index if not exists idx_planned_tasks_user_sort on public.planned_tasks(user_id, sort_order);

alter table public.planned_tasks enable row level security;

create policy "Users can manage own planned tasks"
  on public.planned_tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Link timer record to planned task when started from one
alter table public.timer_records
  add column if not exists planned_task_id uuid references public.planned_tasks(id) on delete set null;

create index if not exists idx_timer_records_planned_task on public.timer_records(planned_task_id);
