import { useEffect, useState, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { dayBoundsUtc, isTodayMoscow } from '../lib/dateUtils';
import type { TimerCategory } from '../types/db';
import type { TimerRecord } from '../types/db';
import TimelineStrip from '../components/Tracker/TimelineStrip';
import TimeRangeModal from '../components/Tracker/TimeRangeModal';
import TimerBlock from '../components/Tracker/TimerBlock';
import RecordList from '../components/Tracker/RecordList';

type OutletContext = {
  timelineVisible: boolean;
  completedBlockVisible: boolean;
};

const NO_CATEGORY_COLOR = '#666666';

export default function TrackerPage() {
  const { user } = useAuth();
  const { selectedDate } = useApp();
  const { prefs, setTimelineStartHour, setTimelineEndHour } = usePreferences();
  const { timelineVisible, completedBlockVisible } = useOutletContext<OutletContext>();

  const [categories, setCategories] = useState<TimerCategory[]>([]);
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<TimerRecord | null>(null);
  const [timeRangeModal, setTimeRangeModal] = useState<'start' | 'end' | null>(null);
  const [tick, setTick] = useState(0);
  const [minuteTick, setMinuteTick] = useState(0);

  useEffect(() => {
    if (!activeRecord) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [activeRecord]);

  useEffect(() => {
    if (!activeRecord) return;
    const id = setInterval(() => setMinuteTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, [activeRecord]);

  const bounds = useMemo(() => dayBoundsUtc(selectedDate), [selectedDate]);

  const loadCategories = () => {
    if (!user?.id) return;
    supabase
      .from('timer_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setCategories((data as TimerCategory[]) ?? []));
  };

  useEffect(() => {
    loadCategories();
  }, [user?.id]);

  useEffect(() => {
    const handler = () => loadCategories();
    window.addEventListener('timer-categories-changed', handler);
    return () => window.removeEventListener('timer-categories-changed', handler);
  }, [user?.id]);

  const loadRecords = () => {
    if (!user?.id) return;
    supabase
      .from('timer_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('started_at', bounds.from)
      .lte('started_at', bounds.to)
      .order('started_at', { ascending: false })
      .then(({ data }) => setRecords((data as TimerRecord[]) ?? []));
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

  const loadRecordsRef = useRef(loadRecords);
  const refetchActiveRef = useRef(refetchActiveRecord);
  loadRecordsRef.current = loadRecords;
  refetchActiveRef.current = refetchActiveRecord;

  useEffect(() => {
    loadRecords();
  }, [user?.id, bounds.from, bounds.to]);

  useEffect(() => {
    refetchActiveRecord();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('timer_records_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_records' }, () => {
        loadRecordsRef.current();
        refetchActiveRef.current();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('timer_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_categories' }, () => {
        supabase
          .from('timer_categories')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true })
          .then(({ data }) => setCategories((data as TimerCategory[]) ?? []));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const isToday = isTodayMoscow(selectedDate);
  const effectiveActiveRecord = isToday ? activeRecord : null;

  const totalMs = useMemo(() => {
    let t = 0;
    records.forEach((r) => {
      if (r.ended_at) {
        t += new Date(r.ended_at).getTime() - new Date(r.started_at).getTime();
      }
    });
    if (effectiveActiveRecord) {
      t += Date.now() - new Date(effectiveActiveRecord.started_at).getTime();
    }
    return t;
  }, [records, effectiveActiveRecord, tick]);

  const startHour = prefs?.timeline_start_hour ?? 0;
  const endHour = prefs?.timeline_end_hour ?? 24;

  return (
    <div className="tracker-page">
      {timelineVisible && (
        <>
          <TimelineStrip
            startHour={startHour}
            endHour={endHour}
            selectedDate={selectedDate}
            records={records}
            categories={categories}
            noCategoryColor={NO_CATEGORY_COLOR}
            minuteTick={minuteTick}
            onStartHourClick={() => setTimeRangeModal('start')}
            onEndHourClick={() => setTimeRangeModal('end')}
          />
          {timeRangeModal === 'start' && (
            <TimeRangeModal
              title="Время начала таймлайна"
              onSelect={(h) => {
                setTimelineStartHour(h);
                setTimeRangeModal(null);
              }}
              onClose={() => setTimeRangeModal(null)}
            />
          )}
          {timeRangeModal === 'end' && (
            <TimeRangeModal
              title="Время конца таймлайна"
              onSelect={(h) => {
                setTimelineEndHour(h);
                setTimeRangeModal(null);
              }}
              onClose={() => setTimeRangeModal(null)}
            />
          )}
        </>
      )}

      <TimerBlock
        categories={categories}
        selectedDate={selectedDate}
        activeRecord={effectiveActiveRecord}
        totalMs={totalMs}
        onActiveChange={setActiveRecord}
        onRecordsChange={loadRecords}
      />

      {completedBlockVisible && (
        <RecordList
          records={records}
          categories={categories}
          selectedDate={selectedDate}
          activeRecord={effectiveActiveRecord}
          onRecordsChange={loadRecords}
        />
      )}
    </div>
  );
}
