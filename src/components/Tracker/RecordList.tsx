import { useState, useEffect } from 'react';
import { toZonedTime } from 'date-fns-tz';
import { supabase } from '../../lib/supabase';
import { formatTime, formatDuration, formatDurationTimer, toMoscowISO } from '../../lib/dateUtils';
import plusIcon from '../../assets/plus.svg';
import plusNavIcon from '../../assets/plus-nav.svg';
import editIcon from '../../assets/edit.svg';
import editNavIcon from '../../assets/edit-nav.svg';
import deleteIcon from '../../assets/delete.svg';
import deleteNavIcon from '../../assets/delete-nav.svg';
import closeIcon from '../../assets/close.svg';
import closeNavIcon from '../../assets/close-nav.svg';
import type { TimerRecord } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import AddRecordModal from './AddRecordModal';
import './RecordList.css';

const TZ = 'Europe/Moscow';

type RecordListProps = {
  records: TimerRecord[];
  categories: TimerCategory[];
  selectedDate: Date;
  activeRecord: TimerRecord | null;
  onRecordsChange: () => void;
};

export default function RecordList({
  records,
  categories,
  selectedDate,
  activeRecord,
  onRecordsChange,
}: RecordListProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeLiveMs, setActiveLiveMs] = useState(0);

  useEffect(() => {
    if (!activeRecord) {
      setActiveLiveMs(0);
      return;
    }
    const start = new Date(activeRecord.started_at).getTime();
    const tick = () => setActiveLiveMs(Date.now() - start);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeRecord?.id]);

  const getCategory = (categoryId: string | null) => {
    if (!categoryId) return categories.find((c) => (c as { is_system?: boolean }).is_system) ?? { title: 'Без категории', color: '#666666' };
    return categories.find((c) => c.id === categoryId) ?? { title: '?', color: '#666' };
  };

  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  );

  const handleDelete = async (id: string) => {
    await supabase.from('timer_records').delete().eq('id', id);
    onRecordsChange();
  };

  return (
    <section className="record-list-section">
      <div className="record-list-header">
        <h3>Записи по трекеру</h3>
        <button type="button" className="record-list-add record-list-add-img" onClick={() => setAddOpen(true)} aria-label="Добавить запись">
          <img src={plusIcon} alt="" className="icon-img default" />
          <img src={plusNavIcon} alt="" className="icon-img hover" />
        </button>
      </div>

      <ul className="record-list">
        {activeRecord && (
          <li className="record-item active-record">
            <span className="record-category" style={{ color: getCategory(activeRecord.category_id).color }}>
              {getCategory(activeRecord.category_id).title}
            </span>
            <span className="record-time live">
              {formatDurationTimer(activeLiveMs)}
            </span>
          </li>
        )}
        {sortedRecords
          .filter((r) => r.id !== activeRecord?.id)
          .map((r) => {
            const start = new Date(r.started_at);
            const end = r.ended_at ? new Date(r.ended_at) : new Date();
            const ms = end.getTime() - start.getTime();
            const cat = getCategory(r.category_id);
            return (
              <RecordItemWithComment
                key={r.id}
                record={r}
                category={cat}
                start={start}
                end={end}
                ms={ms}
                onEdit={() => setEditingId(r.id)}
                onDelete={() => handleDelete(r.id)}
                onRecordsChange={onRecordsChange}
              />
            );
          })}
      </ul>

      {addOpen && (
        <AddRecordModal
          categories={categories}
          selectedDate={selectedDate}
          onClose={() => setAddOpen(false)}
          onAdded={onRecordsChange}
        />
      )}

      {editingId && (
        <EditRecordModal
          recordId={editingId}
          records={records}
          categories={categories}
          selectedDate={selectedDate}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            onRecordsChange();
            setEditingId(null);
          }}
        />
      )}
    </section>
  );
}

type RecordItemWithCommentProps = {
  record: TimerRecord;
  category: { title: string; color: string };
  start: Date;
  end: Date;
  ms: number;
  onEdit: () => void;
  onDelete: () => void;
  onRecordsChange: () => void;
};

function RecordItemWithComment({
  record,
  category,
  start,
  end,
  ms,
  onEdit,
  onDelete,
  onRecordsChange,
}: RecordItemWithCommentProps) {
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentText, setCommentText] = useState(record.comment || '');

  useEffect(() => {
    setCommentText(record.comment || '');
  }, [record.comment]);

  const handleCommentSave = async () => {
    const trimmed = commentText.trim();
    const newComment = trimmed.length > 0 ? trimmed : null;
    await supabase
      .from('timer_records')
      .update({ comment: newComment })
      .eq('id', record.id);
    onRecordsChange();
    setIsEditingComment(false);
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommentSave();
    }
    if (e.key === 'Escape') {
      setCommentText(record.comment || '');
      setIsEditingComment(false);
    }
  };

  return (
    <li className="record-item">
      {isEditingComment ? (
        <input
          type="text"
          className="record-comment-input"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onBlur={handleCommentSave}
          onKeyDown={handleCommentKeyDown}
          autoFocus
          placeholder="Введите комментарий"
        />
      ) : (
        <span className="record-category-wrap" onDoubleClick={() => setIsEditingComment(true)}>
          <span className="record-category-head" style={{ color: category.color }}>
            {category.title}
          </span>
          {record.comment ? (
            <>
              <span className="record-comment-bullet"> • </span>
              <span className="record-comment-text">{record.comment}</span>
            </>
          ) : (
            <button
              type="button"
              className="record-comment-btn"
              onClick={(e) => { e.stopPropagation(); setIsEditingComment(true); }}
            >
              • Добавить комментарий
            </button>
          )}
        </span>
      )}
      <span className="record-time">
        <span className="record-interval">{formatTime(start)} - {formatTime(end)} •</span>{' '}
        <span className={ms < 60000 ? 'record-duration record-duration-short' : 'record-duration'}>{formatDuration(ms)}</span>
      </span>
      <div className="record-actions">
        <button type="button" className="icon-btn-small icon-btn-img" onClick={onEdit} aria-label="Редактировать">
          <img src={editIcon} alt="" className="icon-img default" />
          <img src={editNavIcon} alt="" className="icon-img hover" />
        </button>
        <button type="button" className="icon-btn-small icon-btn-img" onClick={onDelete} aria-label="Удалить">
          <img src={deleteIcon} alt="" className="icon-img default" />
          <img src={deleteNavIcon} alt="" className="icon-img hover" />
        </button>
      </div>
    </li>
  );
}

type EditRecordModalProps = {
  recordId: string;
  records: TimerRecord[];
  categories: TimerCategory[];
  selectedDate: Date;
  onClose: () => void;
  onSaved: () => void;
};

function EditRecordModal({ recordId, records, categories, selectedDate, onClose, onSaved }: EditRecordModalProps) {
  const record = records.find((r) => r.id === recordId);
  const [categoryId, setCategoryId] = useState<string | null>(record?.category_id ?? null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const visibleCategories = categories.filter((c) => c.is_visible);
  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const options = noCategory ? [noCategory, ...visibleCategories.filter((c) => !(c as { is_system?: boolean }).is_system)] : visibleCategories;
  const selectedCat = categoryId ? categories.find((c) => c.id === categoryId) : noCategory;
  const selectedColor = selectedCat?.color ?? '#666666';

  if (!record) return null;

  const start = new Date(record.started_at);
  const end = record.ended_at ? new Date(record.ended_at) : new Date();
  const startZ = toZonedTime(start, TZ);
  const endZ = toZonedTime(end, TZ);
  const defaultStart = `${String(startZ.getHours()).padStart(2, '0')}:${String(startZ.getMinutes()).padStart(2, '0')}`;
  const defaultEnd = `${String(endZ.getHours()).padStart(2, '0')}:${String(endZ.getMinutes()).padStart(2, '0')}`;

  const [sStart, sEnd] = [startTime || defaultStart, endTime || defaultEnd];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const started_at = toMoscowISO(selectedDate, sStart);
    const ended_at = toMoscowISO(selectedDate, sEnd);
    if (ended_at <= started_at) {
      setError('Время окончания должно быть позже начала');
      return;
    }
    setError('');
    const { error: err } = await supabase
      .from('timer_records')
      .update({
        category_id: categoryId,
        started_at,
        ended_at,
      })
      .eq('id', recordId);
    if (err) {
      setError(err.message);
      return;
    }
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
            <div className="edit-category-dropdown">
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
              <input type="time" value={sStart} onChange={(e) => setStartTime(e.target.value)} className="form-input" />
            </label>
            <label className="form-label">
              Конец
              <input type="time" value={sEnd} onChange={(e) => setEndTime(e.target.value)} className="form-input" />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn-primary btn-save btn-full">Сохранить</button>
        </form>
      </div>
    </div>
  );
}
