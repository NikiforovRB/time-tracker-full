import { useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';
import type { TimerRecord } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import './TimelineStrip.css';

const TZ = 'Europe/Moscow';

type TimelineStripProps = {
  startHour: number;
  endHour: number;
  selectedDate: Date;
  records: TimerRecord[];
  categories: TimerCategory[];
  noCategoryColor: string;
  minuteTick?: number;
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

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = startHour; i <= endHour; i++) h.push(i);
    return h;
  }, [startHour, endHour]);

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
    </div>
  );
}
