import { useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';
import type { TimerRecord } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import type { PlannedTask } from '../../types/db';
import { formatDuration } from '../../lib/dateUtils';
import './TimelineStrip.css';

const TZ = 'Europe/Moscow';

function lightenHex(hex: string, factor: number): string {
  const n = hex.replace('#', '');
  let r = parseInt(n.slice(0, 2), 16);
  let g = parseInt(n.slice(2, 4), 16);
  let b = parseInt(n.slice(4, 6), 16);
  r = Math.round(r + factor * (255 - r));
  g = Math.round(g + factor * (255 - g));
  b = Math.round(b + factor * (255 - b));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

type TimelineStripProps = {
  startHour: number;
  endHour: number;
  selectedDate: Date;
  records: TimerRecord[];
  categories: TimerCategory[];
  noCategoryColor: string;
  minuteTick?: number;
  activeRecord?: TimerRecord | null;
  plannedTaskForActive?: PlannedTask | null;
  onStartHourClick: () => void;
  onEndHourClick: () => void;
};

export default function TimelineStrip({
  startHour,
  endHour,
  selectedDate,
  records,
  categories,
  noCategoryColor,
  minuteTick = 0,
  activeRecord = null,
  plannedTaskForActive = null,
  onStartHourClick,
  onEndHourClick,
}: TimelineStripProps) {
  const dayStartMinutes = startHour * 60;
  const dayEndMinutes = endHour * 60;
  const total = dayEndMinutes - dayStartMinutes;

  const segments = useMemo(() => {
    const segs: { left: number; width: number; color: string }[] = [];
    const selY = selectedDate.getFullYear();
    const selM = selectedDate.getMonth();
    const selD = selectedDate.getDate();

    records.forEach((r) => {
      const start = new Date(r.started_at);
      const end = r.ended_at ? new Date(r.ended_at) : new Date();
      const startZ = toZonedTime(start, TZ);
      const endZ = toZonedTime(end, TZ);
      const startDate = new Date(startZ.getFullYear(), startZ.getMonth(), startZ.getDate());
      const endDate = new Date(endZ.getFullYear(), endZ.getMonth(), endZ.getDate());
      const selectedDay = new Date(selY, selM, selD);
      if (startDate.getTime() > selectedDay.getTime() || endDate.getTime() < selectedDay.getTime()) return;
      const startMinutes = startZ.getHours() * 60 + startZ.getMinutes();
      const endMinutes = endZ.getHours() * 60 + endZ.getMinutes();
      const rangeStart = startDate.getTime() < selectedDay.getTime()
        ? dayStartMinutes
        : Math.max(dayStartMinutes, startMinutes);
      const rangeEnd = endDate.getTime() > selectedDay.getTime()
        ? dayEndMinutes
        : Math.min(dayEndMinutes, endMinutes);
      if (rangeEnd <= rangeStart) return;
      const cat = r.category_id ? categories.find((c) => c.id === r.category_id) : null;
      const color = cat ? cat.color : noCategoryColor;
      const left = ((rangeStart - dayStartMinutes) / total) * 100;
      const width = ((rangeEnd - rangeStart) / total) * 100;
      segs.push({ left, width, color });
    });

    return segs;
  }, [records, categories, noCategoryColor, startHour, endHour, selectedDate, minuteTick]);

  const { plannedSegments, plannedLabel, overflowLabel } = useMemo(() => {
    const empty = { plannedSegments: [] as { left: number; width: number; color: string }[], plannedLabel: '', overflowLabel: '' };
    if (!activeRecord || !plannedTaskForActive || plannedTaskForActive.planned_minutes == null || plannedTaskForActive.planned_minutes <= 0) {
      return empty;
    }
    const plannedMs = plannedTaskForActive.planned_minutes * 60 * 1000;
    const start = new Date(activeRecord.started_at);
    const now = new Date();
    const cat = activeRecord.category_id ? categories.find((c) => c.id === activeRecord.category_id) : null;
    const color = cat ? cat.color : noCategoryColor;
    const lighterColor = lightenHex(color, 0.4);
    const plannedLabel = formatDuration(plannedMs);
    const elapsedMs = now.getTime() - start.getTime();
    const overflowMs = Math.max(0, elapsedMs - plannedMs);
    const overflowLabel = overflowMs > 0 ? formatDuration(overflowMs) : '';
    const segs: { left: number; width: number; color: string }[] = [];
    const totalDuration = plannedMs;
    const elapsedRatio = elapsedMs / totalDuration;
    const totalWidthRatio = Math.max(1, elapsedRatio);
    segs.push({
      left: 0,
      width: (1 / totalWidthRatio) * 100,
      color,
    });
    if (overflowMs > 0) {
      const overflowRatio = overflowMs / totalDuration;
      segs.push({
        left: (1 / totalWidthRatio) * 100,
        width: (overflowRatio / totalWidthRatio) * 100,
        color: lighterColor,
      });
    }
    return { plannedSegments: segs, plannedLabel, overflowLabel };
  }, [activeRecord, plannedTaskForActive, categories, noCategoryColor, minuteTick]);

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = startHour; i <= endHour; i++) h.push(i);
    return h;
  }, [startHour, endHour]);

  const showPlannedStrip = plannedSegments.length > 0;

  return (
    <div className="timeline-strip-wrap">
      <div className="timeline-strip" style={{ height: 15 }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="timeline-segment"
            style={{
              left: `${seg.left}%`,
              width: `${seg.width}%`,
              backgroundColor: seg.color,
            }}
          />
        ))}
        {hours.map((h) => (
          <div
            key={h}
            className="timeline-hour-line"
            style={{
              left: `${((h - startHour) / (endHour - startHour)) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="timeline-labels">
        {hours.map((h) => (
          <button
            key={h}
            type="button"
            className={`timeline-label ${h === startHour ? 'clickable' : ''} ${h === endHour ? 'clickable' : ''}`}
            style={{
              left: `${((h - startHour) / (endHour - startHour)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
            onClick={() => {
              if (h === startHour) onStartHourClick();
              else if (h === endHour) onEndHourClick();
            }}
          >
            {h}
          </button>
        ))}
      </div>
      {showPlannedStrip && (
        <>
          <div className="timeline-planned-label">
            <span>Время на задачу: {plannedLabel}.</span>
            {overflowLabel && <span className="timeline-planned-overflow">Дополнительное время: {overflowLabel}</span>}
          </div>
          <div className="timeline-strip timeline-strip-planned" style={{ height: 15 }}>
            {plannedSegments.map((seg, i) => (
              <div
                key={i}
                className="timeline-segment"
                style={{
                  left: `${seg.left}%`,
                  width: `${seg.width}%`,
                  backgroundColor: seg.color,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
