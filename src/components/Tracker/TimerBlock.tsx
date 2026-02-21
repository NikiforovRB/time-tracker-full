import { useState, useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import stopIcon from '../../assets/stop.svg';
import stopIconHover from '../../assets/stop-nav.svg';
import { useAuth } from '../../contexts/AuthContext';
import { formatDurationTimer, formatDuration } from '../../lib/dateUtils';
import { isTodayMoscow } from '../../lib/dateUtils';
import type { TimerCategory } from '../../types/db';
import type { TimerRecord } from '../../types/db';
import './TimerBlock.css';

type TimerBlockProps = {
  categories: TimerCategory[];
  selectedDate: Date;
  activeRecord: TimerRecord | null;
  totalMs: number;
  onActiveChange: (r: TimerRecord | null) => void;
  onRecordsChange: () => void;
};

export default function TimerBlock({
  categories,
  selectedDate,
  activeRecord,
  totalMs,
  onActiveChange,
  onRecordsChange,
}: TimerBlockProps) {
  const { user } = useAuth();
  const [hoverStop, setHoverStop] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isToday = isTodayMoscow(selectedDate);
  const visibleCategories = categories.filter((c) => c.is_visible);
  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const options = noCategory ? [noCategory, ...visibleCategories.filter((c) => !(c as { is_system?: boolean }).is_system)] : visibleCategories;

  const displayCategory = activeRecord
    ? (categories.find((c) => c.id === activeRecord.category_id) ?? noCategory)
    : (selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : noCategory) ?? visibleCategories[0] ?? noCategory;
  const displayColor = displayCategory?.color ?? '#666666';
  const isRunning = !!activeRecord;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startTimer = async (categoryId: string | null) => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('timer_records')
      .insert({
        user_id: user.id,
        category_id: categoryId,
        started_at: new Date().toISOString(),
        ended_at: null,
      })
      .select()
      .single();
    if (error) {
      console.error(error);
      return;
    }
    onActiveChange(data as TimerRecord);
    onRecordsChange();
  };

  const stopTimer = async () => {
    if (!activeRecord) return;
    await supabase.from('timer_records').update({ ended_at: new Date().toISOString() }).eq('id', activeRecord.id);
    onActiveChange(null);
    onRecordsChange();
  };

  const handleStart = () => {
    const cat = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : noCategory;
    startTimer(cat && (cat as { is_system?: boolean }).is_system ? null : (cat?.id ?? null));
  };

  const displayMs = totalMs;

  if (!options.length) return null;

  if (!isToday) {
    return (
      <div className="timer-block">
        <div className="timer-display-row timer-digits stopped-only-total">
          {totalMs > 0 && (
            <span className="timer-total-day" style={{ color: '#5a86ee' }}>{formatDuration(totalMs)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="timer-block">
      {dropdownOpen && (
        <div className="timer-dropdown" ref={dropdownRef}>
          {options.map((c) => (
            <button
              key={c.id}
              type="button"
              className="timer-dropdown-item"
              style={{ color: (c as { is_system?: boolean }).is_system ? '#666666' : c.color }}
              onClick={() => {
                setSelectedCategoryId((c as { is_system?: boolean }).is_system ? null : c.id);
                setDropdownOpen(false);
              }}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {isRunning ? (
        <>
          <div
            className="timer-display-row timer-digits running"
            onMouseEnter={() => setHoverStop(true)}
            onMouseLeave={() => setHoverStop(false)}
          >
            {hoverStop ? (
              <button type="button" className="timer-stop-btn" onClick={stopTimer} aria-label="Остановить таймер">
                <img src={stopIcon} alt="" className="timer-stop-icon default" />
                <img src={stopIconHover} alt="" className="timer-stop-icon hover" />
              </button>
            ) : (
              <span className="timer-digits-text">{formatDurationTimer(displayMs)}</span>
            )}
          </div>
          <div className="timer-category-below" style={{ color: displayColor }}>
            <span className="timer-category-below-bg" style={{ backgroundColor: displayColor }} />
            {displayCategory?.title ?? 'Без категории'}
          </div>
        </>
      ) : (
        <div className="timer-stopped-hover-wrap">
          <div className="timer-display-row timer-digits stopped-only-total">
            {totalMs > 0 && (
              <span className="timer-total-day" style={{ color: '#5a86ee' }}>{formatDuration(totalMs)}</span>
            )}
          </div>
          <div className="timer-row-bottom">
            <button
              type="button"
              className="timer-category-btn"
              style={{ color: displayColor }}
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="listbox"
            >
              <span className="timer-category-bg" style={{ backgroundColor: displayColor }} />
              {displayCategory?.title ?? 'Без категории'}
            </button>
            <button
              type="button"
              className="timer-start-btn"
              onClick={handleStart}
              aria-label="Запустить таймер"
            >
              <Play size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
