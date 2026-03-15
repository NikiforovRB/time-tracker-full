import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { TimerCategory } from '../../types/db';
import closeIcon from '../../assets/close.svg';
import closeNavIcon from '../../assets/close-nav.svg';
import './AddRecordModal.css';

type AddPlannedTaskModalProps = {
  categories: TimerCategory[];
  selectedDate: Date;
  onClose: () => void;
  onAdded: () => void;
};

export default function AddPlannedTaskModal({
  categories,
  selectedDate,
  onClose,
  onAdded,
}: AddPlannedTaskModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [plannedHours, setPlannedHours] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState(30);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTitleHeight = () => {
    const ta = titleTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 40)}px`;
  };

  useEffect(() => {
    adjustTitleHeight();
  }, [title]);

  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const visibleCategories = categories.filter((c) => c.is_visible);
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
    const totalMinutes = plannedHours * 60 + plannedMinutes;
    const planned_minutes = totalMinutes > 0 ? totalMinutes : null;
    const plan_date = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const { error } = await supabase.from('planned_tasks').insert({
      user_id: user.id,
      title: title.trim() || 'Новая задача',
      planned_minutes,
      category_id: (selectedCat && !(selectedCat as { is_system?: boolean }).is_system) ? selectedCat.id : null,
      sort_order: 0,
      plan_date,
    });
    if (error) {
      console.error(error);
      return;
    }
    onAdded();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-record-modal add-planned-task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Добавить планируемую задачу</h2>
          <button type="button" className="modal-close modal-close-img" onClick={onClose} aria-label="Закрыть">
            <img src={closeIcon} alt="" className="icon-img default" />
            <img src={closeNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="form-label">
            Название
            <textarea
              ref={titleTextareaRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onInput={adjustTitleHeight}
              className="form-input form-input-multiline"
              placeholder="Новая задача"
              rows={1}
            />
          </label>
          <label className="form-label">
            Время на задачу
            <div className="form-row-fields form-row-time-align">
              <input
                type="number"
                min={0}
                max={99}
                value={plannedHours}
                onChange={(e) => setPlannedHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="form-input form-input-time"
              />
              <span className="form-time-unit">ч</span>
              <input
                type="number"
                min={0}
                max={59}
                value={plannedMinutes}
                onChange={(e) => setPlannedMinutes(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                className="form-input form-input-time"
              />
              <span className="form-time-unit">м</span>
            </div>
          </label>
          <label className="form-label">
            Категория таймера
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
          <button type="submit" className="btn-primary btn-full">Добавить</button>
        </form>
      </div>
    </div>
  );
}
