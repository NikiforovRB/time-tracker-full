import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toMoscowISO } from '../../lib/dateUtils';
import type { TimerCategory } from '../../types/db';
import closeIcon from '../../assets/close.svg';
import closeNavIcon from '../../assets/close-nav.svg';
import './AddRecordModal.css';

type AddRecordModalProps = {
  categories: TimerCategory[];
  selectedDate: Date;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddRecordModal({
  categories,
  selectedDate,
  onClose,
  onAdded,
}: AddRecordModalProps) {
  const { user } = useAuth();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleCategories = categories.filter((c) => c.is_visible);
  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const options = noCategory ? [noCategory, ...visibleCategories.filter((c) => !(c as { is_system?: boolean }).is_system)] : visibleCategories;
  const selectedCat = categoryId ? categories.find((c) => c.id === categoryId) : noCategory;
  const selectedColor = selectedCat?.color ?? '#666666';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    const started_at = toMoscowISO(selectedDate, startTime);
    const ended_at = toMoscowISO(selectedDate, endTime);
    if (ended_at <= started_at) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setError('');
    const { error: err } = await supabase.from('timer_records').insert({
      user_id: user.id,
      category_id: categoryId || null,
      started_at,
      ended_at,
    });
    if (err) {
      setError(err.message);
      return;
    }
    onAdded();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-record-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Добавить запись</h2>
          <button type="button" className="modal-close modal-close-img" onClick={onClose} aria-label="Закрыть">
            <img src={closeIcon} alt="" className="icon-img default" />
            <img src={closeNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="form-label">
            Категория
            <div className="edit-category-dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="edit-category-trigger"
                onClick={() => setDropdownOpen((o) => !o)}
                aria-expanded={dropdownOpen}
              >
                <span className="edit-category-dot" style={{ backgroundColor: selectedColor }} />
                <span style={{ color: selectedColor }}>{selectedCat?.title ?? 'Без категории'}</span>
              </button>
              {dropdownOpen && (
                <div className="edit-category-list">
                  {options.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="edit-category-option"
                      style={{ color: (c as { is_system?: boolean }).is_system ? '#666666' : c.color }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCategoryId((c as { is_system?: boolean }).is_system ? null : c.id);
                        setDropdownOpen(false);
                      }}
                    >
                      <span className="edit-category-dot" style={{ backgroundColor: (c as { is_system?: boolean }).is_system ? '#666666' : c.color }} />
                      {c.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </label>
          <div className="form-row-fields">
            <label className="form-label">
              Начало
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
            </label>
            <label className="form-label">
              Конец
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary btn-full">Добавить</button>
        </form>
      </div>
    </div>
  );
}
