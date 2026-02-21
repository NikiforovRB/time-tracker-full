import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toZonedTime } from 'date-fns-tz';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { usePreferences } from '../contexts/PreferencesContext';
import {
  formatDayLabelMoscow,
  formatMonthYear,
  formatDuration,
  monthBoundsUtc,
  nowInMoscow,
} from '../lib/dateUtils';
import type { TimerRecord } from '../types/db';
import type { TimerCategory } from '../types/db';
import TimelineStrip from '../components/Tracker/TimelineStrip';
import './AnalyticsPage.css';

const TZ = 'Europe/Moscow';
const NO_CATEGORY_COLOR = '#666666';

type DayData = {
  date: Date;
  records: TimerRecord[];
  totalMs: number;
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { setSelectedDate } = useApp();
  const navigate = useNavigate();
  const { prefs } = usePreferences();
  const now = nowInMoscow();
  const [monthDate, setMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [viewMode, setViewMode] = useState<'timelines' | 'calendar'>('timelines');
  const [records, setRecords] = useState<TimerRecord[]>([]);
  const [categories, setCategories] = useState<TimerCategory[]>([]);

  const bounds = useMemo(
    () => monthBoundsUtc(monthDate.getFullYear(), monthDate.getMonth()),
    [monthDate]
  );

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
      .order('started_at', { ascending: true })
      .then(({ data }) => setRecords((data as TimerRecord[]) ?? []));
  };

  const loadRecordsRef = useRef(loadRecords);
  loadRecordsRef.current = loadRecords;

  useEffect(() => {
    loadRecords();
  }, [user?.id, bounds.from, bounds.to]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('analytics_timer_records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_records' }, () => {
        loadRecordsRef.current();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('analytics_timer_categories')
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

  const daysWithData = useMemo((): DayData[] => {
    const byDay = new Map<string, TimerRecord[]>();
    records.forEach((r) => {
      const start = toZonedTime(new Date(r.started_at), TZ);
      const k = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(r);
    });
    const result: DayData[] = [];
    byDay.forEach((recs, k) => {
      const [y, m, d] = k.split('-').map(Number);
      const date = new Date(y, m, d);
      let totalMs = 0;
      recs.forEach((r) => {
        const end = r.ended_at ? new Date(r.ended_at).getTime() : Date.now();
        totalMs += end - new Date(r.started_at).getTime();
      });
      result.push({ date, records: recs, totalMs });
    });
    result.sort((a, b) => a.date.getTime() - b.date.getTime());
    return result;
  }, [records]);

  const startHour = prefs?.timeline_start_hour ?? 0;
  const endHour = prefs?.timeline_end_hour ?? 24;

  const prevMonth = () => {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const startPadding = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const calendarDays: { day: number; date: Date; totalMs: number }[] = [];
  for (let i = 0; i < startPadding; i++) calendarDays.push({ day: 0, date: new Date(0), totalMs: 0 });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dayData = daysWithData.find(
      (x) => x.date.getFullYear() === year && x.date.getMonth() === month && x.date.getDate() === d
    );
    calendarDays.push({ day: d, date, totalMs: dayData?.totalMs ?? 0 });
  }

  return (
    <div className="analytics-page">
      <div className="analytics-month-row">
        <button type="button" className="month-nav" onClick={prevMonth} aria-label="Предыдущий месяц">
          <ChevronLeft size={24} />
        </button>
        <h2 className="analytics-month-title">{formatMonthYear(monthDate)}</h2>
        <button type="button" className="month-nav" onClick={nextMonth} aria-label="Следующий месяц">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="analytics-toggle">
        <button
          type="button"
          className={viewMode === 'timelines' ? 'active' : ''}
          onClick={() => setViewMode('timelines')}
        >
          Таймлайны
        </button>
        <button
          type="button"
          className={viewMode === 'calendar' ? 'active' : ''}
          onClick={() => setViewMode('calendar')}
        >
          Календарь
        </button>
      </div>

      {viewMode === 'timelines' && (
        <div className="analytics-timelines">
          {daysWithData.map(({ date, records: dayRecords, totalMs }) => (
            <div key={date.getTime()} className="analytics-day-block">
              <div className="analytics-day-header">
                <span className="analytics-day-label">{formatDayLabelMoscow(date.getFullYear(), date.getMonth(), date.getDate())} •</span>{' '}
                <span className="analytics-day-duration">{formatDuration(totalMs)}</span>
              </div>
              <TimelineStrip
                startHour={startHour}
                endHour={endHour}
                selectedDate={date}
                records={dayRecords}
                categories={categories}
                noCategoryColor={NO_CATEGORY_COLOR}
                onStartHourClick={() => {}}
                onEndHourClick={() => {}}
              />
            </div>
          ))}
        </div>
      )}

      {viewMode === 'calendar' && (
        <div className="analytics-calendar">
          <div className="calendar-weekdays">
            <span>пн</span>
            <span>вт</span>
            <span>ср</span>
            <span>чт</span>
            <span>пт</span>
            <span>сб</span>
            <span>вс</span>
          </div>
          <div className="calendar-grid">
            {calendarDays.map((cell, i) => (
              <div
                key={i}
                className="calendar-cell"
                role={cell.day > 0 ? 'button' : undefined}
                onClick={() => {
                  if (cell.day > 0 && cell.date) {
                    setSelectedDate(cell.date);
                    navigate('/');
                  }
                }}
              >
                {cell.day > 0 ? (
                  <>
                    <span className="calendar-day-num">{cell.day}</span>
                    {cell.totalMs > 0 && (
                      <span className="calendar-day-duration">{formatDuration(cell.totalMs)}</span>
                    )}
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
