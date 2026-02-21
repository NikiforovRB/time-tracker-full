-- Add timer tables to realtime publication so changes in Settings
-- (add/update/delete categories) sync to all dropdowns and pages.
alter publication supabase_realtime add table public.timer_categories;
alter publication supabase_realtime add table public.timer_records;
