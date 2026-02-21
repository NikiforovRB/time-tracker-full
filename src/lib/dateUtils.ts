import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ru } from 'date-fns/locale';

const TZ = 'Europe/Moscow';
const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function formatDayLabelMoscow(year: number, month: number, day: number): string {
  const today = nowInMoscow();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();
  const d = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+03:00`);
  const dayNum = day;
  const monthStr = formatInTimeZone(d, TZ, 'MMMM', { locale: ru });
  const w = WEEKDAY_SHORT[d.getDay()];
  const dayMonthWeekday = `${dayNum} ${monthStr}, ${w}`;
  if (year === todayY && month === todayM && day === todayD) return `Сегодня, ${dayMonthWeekday}`;
  const dayMs = new Date(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00+03:00`).getTime();
  const todayMs = new Date(`${todayY}-${String(todayM + 1).padStart(2, '0')}-${String(todayD).padStart(2, '0')}T12:00:00+03:00`).getTime();
  const diffDays = Math.round((dayMs - todayMs) / (24 * 60 * 60 * 1000));
  if (diffDays === -1) return `Вчера, ${dayMonthWeekday}`;
  if (diffDays === 1) return `Завтра, ${dayMonthWeekday}`;
  return dayMonthWeekday;
}

export function nowInMoscow(): Date {
  return toZonedTime(new Date(), TZ);
}

function dayMonthWeekdayShort(d: Date): string {
  const day = d.getDate();
  const month = format(d, 'MMMM', { locale: ru });
  const w = WEEKDAY_SHORT[d.getDay()];
  return `${day} ${month}, ${w}`;
}

export function formatDateHeader(d: Date): string {
  const today = nowInMoscow();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((dStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));
  const dayMonthWeekday = dayMonthWeekdayShort(d);
  if (diffDays === -1) return `Вчера, ${dayMonthWeekday}`;
  if (diffDays === 0) return `Сегодня, ${dayMonthWeekday}`;
  if (diffDays === 1) return `Завтра, ${dayMonthWeekday}`;
  return dayMonthWeekday;
}

export function formatDateShort(d: Date): string {
  return format(d, 'd MMMM, EEE', { locale: ru });
}

export function formatMonthYear(d: Date): string {
  const s = format(d, 'LLLL yyyy', { locale: ru });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function toMoscow(date: Date): Date {
  return toZonedTime(date, TZ);
}

export function startOfDayMoscow(d: Date): Date {
  const z = toZonedTime(d, TZ);
  const start = new Date(z.getFullYear(), z.getMonth(), z.getDate());
  return start;
}

export function endOfDayMoscow(d: Date): Date {
  const z = toZonedTime(d, TZ);
  const end = new Date(z.getFullYear(), z.getMonth(), z.getDate(), 23, 59, 59, 999);
  return end;
}

/** Calendar date + HH:mm (Moscow) to ISO string */
export function toMoscowISO(calendarDate: Date, timeHHmm: string): string {
  const y = calendarDate.getFullYear();
  const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
  const day = String(calendarDate.getDate()).padStart(2, '0');
  const timePart = timeHHmm.length === 5 ? `${timeHHmm}:00` : timeHHmm;
  return new Date(`${y}-${m}-${day}T${timePart}+03:00`).toISOString();
}

/** Whether the calendar date is today in Moscow */
export function isTodayMoscow(calendarDate: Date): boolean {
  const now = nowInMoscow();
  return (
    calendarDate.getFullYear() === now.getFullYear() &&
    calendarDate.getMonth() === now.getMonth() &&
    calendarDate.getDate() === now.getDate()
  );
}

/** Get start/end of day in UTC for Supabase query (calendar date interpreted in Moscow) */
export function dayBoundsUtc(calendarDate: Date): { from: string; to: string } {
  const y = calendarDate.getFullYear();
  const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
  const day = String(calendarDate.getDate()).padStart(2, '0');
  const s = `${y}-${m}-${day}`;
  const start = new Date(`${s}T00:00:00+03:00`);
  const end = new Date(`${s}T23:59:59.999+03:00`);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/** Get start/end of month in UTC for Supabase (month in Moscow) */
export function monthBoundsUtc(year: number, month: number): { from: string; to: string } {
  const m = String(month + 1).padStart(2, '0');
  const from = new Date(`${year}-${m}-01T00:00:00+03:00`).toISOString();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const d = String(lastDay).padStart(2, '0');
  const to = new Date(`${year}-${m}-${d}T23:59:59.999+03:00`).toISOString();
  return { from, to };
}

export function formatTime(d: Date): string {
  return formatInTimeZone(d, TZ, 'HH:mm');
}

export function formatDuration(ms: number): string {
  if (ms < 60 * 1000) return 'Менее минуты';
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  if (mins > 0) parts.push(`${mins} м`);
  return parts.join(' ') || 'Менее минуты';
}

export function formatDurationTimer(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const s = sec % 60;
  const mins = m % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  if (m > 0 || h > 0) parts.push(`${mins} м`);
  parts.push(`${s} с`);
  return parts.join(' ');
}

/** Hours and minutes only (no seconds), for stopped timer */
export function formatDurationTimerStopped(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ч`);
  if (mins > 0) parts.push(`${mins} м`);
  return parts.join(' ') || '0 м';
}
