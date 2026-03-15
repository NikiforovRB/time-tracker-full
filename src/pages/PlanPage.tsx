import { useEffect, useState, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { dayBoundsUtc } from '../lib/dateUtils';
import type { TimerCategory } from '../types/db';
import type { TimerRecord } from '../types/db';
import type { PlannedTask } from '../types/db';
import TimerBlock from '../components/Tracker/TimerBlock';
import PlannedTaskList from '../components/Tracker/PlannedTaskList';
import PlannedTaskTimeline from '../components/Tracker/PlannedTaskTimeline';
import CompletedPlannedList from '../components/Tracker/CompletedPlannedList';

const NO_CATEGORY_COLOR = '#666666';

type OutletContext = { completedBlockVisible: boolean };

export default function PlanPage() {
  const { user } = useAuth();
  const { selectedDate } = useApp();
  const { completedBlockVisible = true } = useOutletContext<OutletContext>() ?? {};
  const [categories, setCategories] = useState<TimerCategory[]>([]);
  const [plannedTasks, setPlannedTasks] = useState<PlannedTask[]>([]);
  const [completedPlannedTaskIds, setCompletedPlannedTaskIds] = useState<Set<string>>(new Set());
  const [activeRecord, setActiveRecord] = useState<TimerRecord | null>(null);
  const [tick, setTick] = useState(0);

  const dayBounds = useMemo(() => dayBoundsUtc(selectedDate), [selectedDate]);
  const planDateStr = useMemo(
    () =>
      `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
    [selectedDate]
  );

  useEffect(() => {
    if (!activeRecord) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeRecord]);

  const loadCategories = () => {
    if (!user?.id) return;
    supabase
      .from('timer_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setCategories((data as TimerCategory[]) ?? []));
  };

  const loadPlannedTasks = () => {
    if (!user?.id) return;
    supabase
      .from('planned_tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', planDateStr)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setPlannedTasks((data as PlannedTask[]) ?? []));
  };

  const loadCompletedPlannedTaskIds = () => {
    if (!user?.id) return;
    supabase
      .from('timer_records')
      .select('planned_task_id')
      .eq('user_id', user.id)
      .not('planned_task_id', 'is', null)
      .not('ended_at', 'is', null)
      .gte('ended_at', dayBounds.from)
      .lte('ended_at', dayBounds.to)
      .then(({ data }) => {
        const ids = new Set((data ?? []).map((r: { planned_task_id: string }) => r.planned_task_id));
        setCompletedPlannedTaskIds(ids);
      });
  };

  const refetchActiveRecord = () => {
    if (!user?.id) return;
    supabase
      .from('timer_records')
      .select('*')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .maybeSingle()
      .then(({ data }) => setActiveRecord((data as TimerRecord | null) ?? null));
  };

  const loadPlannedRef = useRef(loadPlannedTasks);
  const refetchActiveRef = useRef(refetchActiveRecord);
  loadPlannedRef.current = loadPlannedTasks;
  refetchActiveRef.current = refetchActiveRecord;

  useEffect(() => {
    loadCategories();
    refetchActiveRecord();
  }, [user?.id]);

  useEffect(() => {
    loadPlannedTasks();
  }, [user?.id, planDateStr]);

  useEffect(() => {
    loadCompletedPlannedTaskIds();
  }, [user?.id, dayBounds.from, dayBounds.to]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('plan_timer_records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_records' }, () => {
        refetchActiveRef.current();
        loadCompletedPlannedTaskIds();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('plan_planned_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'planned_tasks' }, () => {
        loadPlannedRef.current();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const startTimerFromPlannedTask = async (task: PlannedTask) => {
    if (!user?.id) return;
    await supabase.from('timer_records').insert({
      user_id: user.id,
      category_id: task.category_id ?? null,
      started_at: new Date().toISOString(),
      ended_at: null,
      planned_task_id: task.id,
    });
    refetchActiveRef.current();
    loadPlannedRef.current();
  };

  const handlePlannedReorder = async (orderedIds: string[]) => {
    if (!user?.id) return;
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase.from('planned_tasks').update({ sort_order: i }).eq('id', orderedIds[i]).eq('user_id', user.id);
    }
    loadPlannedRef.current();
  };

  const loadRecordsNoop = () => {};

  const activePlannedTask =
    activeRecord?.planned_task_id != null
      ? plannedTasks.find((t) => t.id === activeRecord.planned_task_id) ?? null
      : null;

  const elapsedMs = activeRecord
    ? Date.now() - new Date(activeRecord.started_at).getTime()
    : 0;

  return (
    <div className="plan-page tracker-page">
      {activeRecord && activePlannedTask && (
        <>
          <PlannedTaskTimeline
            activeRecord={activeRecord}
            plannedTask={activePlannedTask}
            categories={categories}
            noCategoryColor={NO_CATEGORY_COLOR}
            minuteTick={tick}
          />
          <TimerBlock
            categories={categories}
            selectedDate={selectedDate}
            activeRecord={activeRecord}
            totalMs={elapsedMs}
            onActiveChange={setActiveRecord}
            onRecordsChange={loadRecordsNoop}
            planMode
          />
        </>
      )}

      <PlannedTaskList
        plannedTasks={plannedTasks.filter((t) => !completedPlannedTaskIds.has(t.id))}
        categories={categories}
        selectedDate={selectedDate}
        activeRecord={activeRecord}
        onTasksChange={() => { loadPlannedTasks(); loadCompletedPlannedTaskIds(); }}
        onStartFromPlannedTask={startTimerFromPlannedTask}
        hideActiveTask
        onReorder={handlePlannedReorder}
      />
      {completedBlockVisible && (
        <CompletedPlannedList
          categories={categories}
          selectedDate={selectedDate}
          onRecordsChange={() => {}}
        />
      )}
    </div>
  );
}
