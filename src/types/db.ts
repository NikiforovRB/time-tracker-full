export interface TimerCategory {
  id: string;
  user_id: string;
  title: string;
  color: string;
  is_visible: boolean;
  sort_order: number;
  is_system: boolean;
}

export interface PlannedTask {
  id: string;
  user_id: string;
  title: string;
  planned_minutes: number | null;
  category_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface TimerRecord {
  id: string;
  user_id: string;
  category_id: string | null;
  started_at: string;
  ended_at: string | null;
  comment: string | null;
  planned_task_id: string | null;
  completed_plan_title: string | null;
}

export interface UserPreferences {
  user_id: string;
  timeline_start_hour: number;
  timeline_end_hour: number;
  timeline_visible: boolean;
  completed_tasks_block_visible: boolean;
  analytics_view_mode: 'timelines' | 'calendar';
}
