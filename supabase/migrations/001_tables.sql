-- Timer categories (user_id from auth.users)
create table if not exists public.timer_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text not null default '#666666',
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_timer_categories_user_id on public.timer_categories(user_id);
create index if not exists idx_timer_categories_user_sort on public.timer_categories(user_id, sort_order);

-- Timer records
create table if not exists public.timer_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.timer_categories(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_timer_records_user_id on public.timer_records(user_id);
create index if not exists idx_timer_records_user_started on public.timer_records(user_id, started_at);

-- User preferences (one row per user)
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timeline_start_hour integer not null default 0 check (timeline_start_hour >= 0 and timeline_start_hour <= 24),
  timeline_end_hour integer not null default 24 check (timeline_end_hour >= 0 and timeline_end_hour <= 24),
  timeline_visible boolean not null default true,
  completed_tasks_block_visible boolean not null default true,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.timer_categories enable row level security;
alter table public.timer_records enable row level security;
alter table public.user_preferences enable row level security;

create policy "Users can manage own categories"
  on public.timer_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own records"
  on public.timer_records for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
