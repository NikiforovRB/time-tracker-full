import { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { formatDuration, formatTime, dayBoundsUtc } from '../../lib/dateUtils';
import { toMoscowISO } from '../../lib/dateUtils';
import kvcompleteIcon from '../../assets/kvcomplete.svg';
import editIcon from '../../assets/edit.svg';
import editNavIcon from '../../assets/edit-nav.svg';
import deleteIcon from '../../assets/delete.svg';
import deleteNavIcon from '../../assets/delete-nav.svg';
import closeIcon from '../../assets/close.svg';
import closeNavIcon from '../../assets/close-nav.svg';
import type { TimerRecord } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import type { PlannedTask } from '../../types/db';
import './CompletedPlannedList.css';
import './PlannedTaskList.css';
import './AddRecordModal.css';
import '../SettingsModal.css';

const TZ = 'Europe/Moscow';

function CompletedPlannedItem({
  record,
  plannedTasksMap,
  categories,
  noCategory,
  onEditRecord,
  onDelete,
  onTitleSaved,
  isNewlyAdded,
}: {
  record: TimerRecord;
  plannedTasksMap: Record<string, PlannedTask>;
  categories: TimerCategory[];
  noCategory: TimerCategory | undefined;
  onEditRecord: () => void;
  onDelete: () => void;
  onTitleSaved: () => void;
  isNewlyAdded?: boolean;
}) {
  const task = record.planned_task_id ? plannedTasksMap[record.planned_task_id] : null;
  const displayTitle = record.completed_plan_title ?? task?.title ?? '—';
  const [title, setTitle] = useState(displayTitle);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    setTitle(record.completed_plan_title ?? task?.title ?? '—');
  }, [record.id, record.completed_plan_title, task?.title]);

  const plannedMs = (task?.planned_minutes ?? 0) * 60 * 1000;
  const start = new Date(record.started_at);
  const end = new Date(record.ended_at!);
  const actualMs = end.getTime() - start.getTime();
  const cat = record.category_id ? categories.find((c) => c.id === record.category_id) : noCategory;

  const saveTitle = async () => {
    setEditingTitle(false);
    const t = title.trim() || task?.title || '—';
    if (t === (record.completed_plan_title ?? task?.title ?? '—')) return;
    await supabase.from('timer_records').update({ completed_plan_title: t || null }).eq('id', record.id);
    onTitleSaved();
  };

  return (
    <li
      data-record-id={record.id}
      className={`completed-planned-item${isNewlyAdded ? ' completed-planned-item-enter' : ''}`}
    >
      <img src={kvcompleteIcon} alt="" className="completed-planned-icon" />
      <div className="completed-planned-left">
        <div className="completed-planned-title-wrap">
          {editingTitle ? (
            <input
              type="text"
              className="completed-planned-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
              autoFocus
            />
          ) : (
            <span className="completed-planned-title" onClick={() => setEditingTitle(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(true)}>
              {displayTitle}
            </span>
          )}
        </div>
        {record.category_id && cat && !(cat as { is_system?: boolean }).is_system && (
          <span className="completed-planned-category" style={{ color: cat.color }}>
            {cat.title}
          </span>
        )}
      </div>
      <div className="completed-planned-right">
        <div className="completed-planned-actions">
          <button type="button" className="planned-item-edit planned-item-edit-img" onClick={onEditRecord} aria-label="Редактировать">
            <img src={editIcon} alt="" className="icon-img default" />
            <img src={editNavIcon} alt="" className="icon-img hover" />
          </button>
          <button type="button" className="planned-item-delete planned-item-delete-img" onClick={async () => { await supabase.from('timer_records').delete().eq('id', record.id); onDelete(); }} aria-label="Удалить">
            <img src={deleteIcon} alt="" className="icon-img default" />
            <img src={deleteNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <div className="completed-planned-below-wrap">
          <div className="completed-planned-meta-block">
            {plannedMs > 0 && (
              <span className="completed-planned-meta">
                План: {formatDuration(plannedMs)}
              </span>
            )}
            <span className="completed-planned-meta">
              Факт: {formatTime(start)} - {formatTime(end)} •{' '}
              {plannedMs > 0 && actualMs <= plannedMs + 60 * 1000 ? (
                <span style={{ color: '#48c011' }}>{formatDuration(actualMs)}</span>
              ) : (
                formatDuration(actualMs)
              )}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

type CompletedPlannedListProps = {
  categories: TimerCategory[];
  selectedDate: Date;
  onRecordsChange: () => void;
};

type CompletedItem = TimerRecord & { plannedTask?: PlannedTask | null };

const fetchCompleted = async (userId: string, bounds: { from: string; to: string }) => {
  const { data } = await supabase
    .from('timer_records')
    .select('*')
    .eq('user_id', userId)
    .not('planned_task_id', 'is', null)
    .not('ended_at', 'is', null)
    .gte('ended_at', bounds.from)
    .lte('ended_at', bounds.to)
    .order('ended_at', { ascending: false });
  const records = (data as TimerRecord[]) ?? [];
  const ids = [...new Set(records.map((r) => r.planned_task_id).filter(Boolean))] as string[];
  let plannedTasksMap: Record<string, PlannedTask> = {};
  if (ids.length > 0) {
    const { data: tasks } = await supabase.from('planned_tasks').select('*').in('id', ids);
    (tasks ?? []).forEach((t) => { plannedTasksMap[t.id] = t as PlannedTask; });
  }
  return { records, plannedTasksMap };
};

export default function CompletedPlannedList({ categories, selectedDate, onRecordsChange }: CompletedPlannedListProps) {
  const { user } = useAuth();
  const dayBounds = useMemo(() => dayBoundsUtc(selectedDate), [selectedDate]);
  const [completed, setCompleted] = useState<CompletedItem[]>([]);
  const [plannedTasksMap, setPlannedTasksMap] = useState<Record<string, PlannedTask>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const prevPositions = useRef<Record<string, number>>({});
  const listRef = useRef<HTMLUListElement>(null);

  const loadCompleted = useCallback(() => {
    if (!user?.id) return;
    fetchCompleted(user.id, dayBounds).then(({ records, plannedTasksMap: map }) => {
      setCompleted((prev) => {
        const next = records as CompletedItem[];
        const newFirstId = next[0]?.id;
        const hadNewFirst = newFirstId && (prev.length === 0 || prev[0].id !== newFirstId);
        if (hadNewFirst && newFirstId && listRef.current) {
          prevPositions.current = {};
          const listEl = listRef.current;
          for (let i = 0; i < listEl.children.length; i++) {
            const id = prev[i]?.id;
            if (id) prevPositions.current[id] = (listEl.children[i] as HTMLElement).getBoundingClientRect().top;
          }
          setTimeout(() => setJustAddedId(newFirstId), 0);
          setTimeout(() => setJustAddedId(null), 450);
        }
        return next;
      });
      setPlannedTasksMap(map);
    });
  }, [user?.id, dayBounds.from, dayBounds.to]);

  useEffect(() => {
    loadCompleted();
  }, [loadCompleted]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('completed_planned_records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timer_records' }, () => {
        loadCompleted();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, loadCompleted]);

  useLayoutEffect(() => {
    if (Object.keys(prevPositions.current).length === 0) return;
    const listEl = listRef.current;
    if (!listEl) return;
    const items = listEl.querySelectorAll<HTMLLIElement>('.completed-planned-item');
    const toAnimate: { el: HTMLLIElement; dy: number }[] = [];
    items.forEach((el) => {
      const key = el.getAttribute('data-record-id');
      if (!key) return;
      const oldTop = prevPositions.current[key];
      if (oldTop == null) return;
      const newTop = el.getBoundingClientRect().top;
      const dy = oldTop - newTop;
      if (Math.abs(dy) > 1) toAnimate.push({ el, dy });
    });
    toAnimate.forEach(({ el, dy }) => {
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    });
    const raf = requestAnimationFrame(() => {
      toAnimate.forEach(({ el }) => {
        el.style.transition = 'transform 0.35s ease';
        el.style.transform = 'translateY(0)';
        el.ontransitionend = () => {
          el.style.transition = '';
          el.style.transform = '';
          el.ontransitionend = null;
        };
      });
      prevPositions.current = {};
    });
    return () => cancelAnimationFrame(raf);
  }, [completed]);

  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const editingRecord = editingRecordId ? completed.find((r) => r.id === editingRecordId) : null;

  return (
    <section className="completed-planned-section">
      <div className="completed-planned-header">
        <h3>Выполненные задачи</h3>
      </div>
      <ul ref={listRef} className="completed-planned-list">
        {completed.map((record) => (
          <CompletedPlannedItem
            key={record.id}
            record={record}
            plannedTasksMap={plannedTasksMap}
            categories={categories}
            noCategory={noCategory}
            isNewlyAdded={record.id === justAddedId}
            onEditRecord={() => setEditingRecordId(record.id)}
            onDelete={() => {
              setCompleted((prev) => prev.filter((r) => r.id !== record.id));
              onRecordsChange();
            }}
            onTitleSaved={loadCompleted}
          />
        ))}
      </ul>

      {editingRecord && (
        <EditCompletedPlannedModal
          record={editingRecord}
          records={completed}
          categories={categories}
          onClose={() => setEditingRecordId(null)}
          onSaved={() => {
            setEditingRecordId(null);
            loadCompleted();
            onRecordsChange();
          }}
        />
      )}
    </section>
  );
}

function EditCompletedPlannedModal({
  record,
  records: _records,
  categories,
  onClose,
  onSaved,
}: {
  record: TimerRecord;
  records: TimerRecord[];
  categories: TimerCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const start = new Date(record.started_at);
  const end = new Date(record.ended_at!);
  const startZ = toZonedTime(start, TZ);
  const endZ = toZonedTime(end, TZ);
  const defaultStart = `${String(startZ.getHours()).padStart(2, '0')}:${String(startZ.getMinutes()).padStart(2, '0')}`;
  const defaultEnd = `${String(endZ.getHours()).padStart(2, '0')}:${String(endZ.getMinutes()).padStart(2, '0')}`;
  const selectedDate = new Date(startZ.getFullYear(), startZ.getMonth(), startZ.getDate());

  const [categoryId, setCategoryId] = useState<string | null>(record.category_id);
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    const started_at = toMoscowISO(selectedDate, startTime);
    const ended_at = toMoscowISO(selectedDate, endTime);
    if (ended_at <= started_at) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setError('');
    await supabase
      .from('timer_records')
      .update({ category_id: categoryId, started_at, ended_at })
      .eq('id', record.id);
    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal add-record-modal edit-record-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Редактировать запись</h2>
          <button type="button" className="modal-close modal-close-img" onClick={onClose} aria-label="Закрыть">
            <img src={closeIcon} alt="" className="icon-img default" />
            <img src={closeNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <label className="form-label">
            Категория
            <div className="edit-category-dropdown" ref={dropdownRef}>
              <button type="button" className="edit-category-trigger" onClick={() => setDropdownOpen((o) => !o)} aria-expanded={dropdownOpen}>
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
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-input" />
            </label>
            <label className="form-label">
              Конец
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-input" />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary btn-save btn-full">Сохранить</button>
        </form>
      </div>
    </div>
  );
}
