import { useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';
import type { TimerRecord } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import type { PlannedTask } from '../../types/db';
import { formatDuration, formatTime } from '../../lib/dateUtils';
import './PlannedTaskTimeline.css';

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

type PlannedTaskTimelineProps = {
  activeRecord: TimerRecord;
  plannedTask: PlannedTask;
  categories: TimerCategory[];
  noCategoryColor: string;
  minuteTick: number;
};

export default function PlannedTaskTimeline({
  activeRecord,
  plannedTask,
  categories,
  noCategoryColor,
  minuteTick,
}: PlannedTaskTimelineProps) {
  const { plannedLabel, overflowLabel, segments, startTimeStr, endTimeStr, currentTimeStr, hasOverflow, endTimePositionPct } = useMemo(() => {
    if (plannedTask.planned_minutes == null || plannedTask.planned_minutes <= 0) {
      return {
        plannedLabel: '',
        overflowLabel: '',
        segments: [] as { left: number; width: number; color: string }[],
        startTimeStr: '',
        endTimeStr: '',
        currentTimeStr: '',
        hasOverflow: false,
        endTimeLeftPct: 100,
      };
    }
    const plannedMs = plannedTask.planned_minutes * 60 * 1000;
    const start = new Date(activeRecord.started_at);
    const now = new Date();
    const plannedEnd = new Date(start.getTime() + plannedMs);
    const cat = activeRecord.category_id ? categories.find((c) => c.id === activeRecord.category_id) : null;
    const color = cat ? cat.color : noCategoryColor;
    const lighterColor = lightenHex(color, 0.4);
    const plannedLabel = formatDuration(plannedMs);
    const elapsedMs = now.getTime() - start.getTime();
    const overflowMs = Math.max(0, elapsedMs - plannedMs);
    const overflowLabel = overflowMs > 0 ? formatDuration(overflowMs) : '';
    const startTimeStr = formatTime(start);
    const endTimeStr = formatTime(plannedEnd);
    const nowZ = toZonedTime(now, TZ);
    const currentTimeStr = `${String(nowZ.getHours()).padStart(2, '0')}:${String(nowZ.getMinutes()).padStart(2, '0')}`;

    const totalDuration = plannedMs;
    const elapsedRatio = elapsedMs / totalDuration;
    const segs: { left: number; width: number; color: string }[] = [];
    let endTimeLeftPct: number;

    if (elapsedMs <= plannedMs) {
      const fillPct = totalDuration > 0 ? (elapsedMs / totalDuration) * 100 : 0;
      segs.push({ left: 0, width: fillPct, color });
      endTimeLeftPct = fillPct;
    } else {
      const totalWidthRatio = elapsedMs / totalDuration;
      const plannedSegmentPct = (1 / totalWidthRatio) * 100;
      const overflowRatio = overflowMs / totalDuration;
      segs.push({ left: 0, width: plannedSegmentPct, color });
      segs.push({
        left: plannedSegmentPct,
        width: (overflowRatio / totalWidthRatio) * 100,
        color: lighterColor,
      });
      endTimeLeftPct = plannedSegmentPct;
    }

    const hasOverflow = overflowMs > 0;
    const endTimePositionPct = hasOverflow ? endTimeLeftPct : 100;

    return {
      plannedLabel,
      overflowLabel,
      segments: segs,
      startTimeStr,
      endTimeStr,
      currentTimeStr,
      hasOverflow,
      endTimePositionPct,
    };
  }, [activeRecord, plannedTask, categories, noCategoryColor, minuteTick]);

  return (
    <div className="planned-task-timeline-wrap">
      <div className="planned-task-timeline-title">{plannedTask.title}</div>
      <div className="planned-task-timeline-label">
        <span>Время на задачу: {plannedLabel}.</span>
        {overflowLabel && <span className="planned-task-timeline-overflow">Дополнительное время: {overflowLabel}</span>}
      </div>
      <div className="planned-task-timeline-strip" style={{ backgroundColor: '#1a1a1a' }}>
        {segments.map((seg, i) => (
          <div
            key={i}
            className="planned-task-timeline-segment"
            style={{
              left: `${seg.left}%`,
              width: `${seg.width}%`,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </div>
      <div className="planned-task-timeline-times">
        <span className="planned-task-time-start">{startTimeStr}</span>
        <span
          className="planned-task-time-end"
          style={{
            left: `${endTimePositionPct}%`,
            transform: endTimePositionPct >= 100 ? 'translateX(-100%)' : 'translateX(-50%)',
          }}
        >
          {endTimeStr}
        </span>
        {hasOverflow && <span className="planned-task-time-now">{currentTimeStr}</span>}
      </div>
    </div>
  );
}
