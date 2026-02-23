-- Persist analytics view mode (Таймлайны / Календарь) per user
alter table public.user_preferences
  add column if not exists analytics_view_mode text not null default 'timelines'
  check (analytics_view_mode in ('timelines', 'calendar'));
