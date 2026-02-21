export interface TimerCategory {
  id: string;
  user_id: string;
  title: string;
  color: string;
  is_visible: boolean;
  sort_order: number;
  is_system: boolean;
}

export interface TimerRecord {
  id: string;
  user_id: string;
  category_id: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface UserPreferences {
  user_id: string;
  timeline_start_hour: number;
  timeline_end_hour: number;
  timeline_visible: boolean;
  completed_tasks_block_visible: boolean;
}
