import { supabase } from './supabase';

const NO_CATEGORY_TITLE = 'Без категории';
const NO_CATEGORY_COLOR = '#666666';

export async function ensureUserSetup(userId: string): Promise<void> {
  const [catRes, prefsRes] = await Promise.all([
    supabase.from('timer_categories').select('id, is_system').eq('user_id', userId),
    supabase.from('user_preferences').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);

  const hasSystemCategory = (catRes.data ?? []).some((c: { is_system?: boolean }) => c.is_system);
  if (!hasSystemCategory) {
    const maxOrderRes = await supabase
      .from('timer_categories')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = ((maxOrderRes.data as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    await supabase.from('timer_categories').insert({
      user_id: userId,
      title: NO_CATEGORY_TITLE,
      color: NO_CATEGORY_COLOR,
      is_visible: true,
      sort_order: nextOrder,
      is_system: true,
    });
  }

  if (!prefsRes.data) {
    await supabase.from('user_preferences').insert({
      user_id: userId,
      timeline_start_hour: 0,
      timeline_end_hour: 24,
      timeline_visible: true,
      completed_tasks_block_visible: true,
    });
  }
}
