import { useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { TimerCategory } from '../types/db';
import eyeIcon from '../assets/eye.svg';
import eyeNavIcon from '../assets/eye-nav.svg';
import eyeoffIcon from '../assets/eyeoff.svg';
import eyeoffNavIcon from '../assets/eyeoff-nav.svg';
import closeIcon from '../assets/close.svg';
import closeNavIcon from '../assets/close-nav.svg';
import editIcon from '../assets/edit.svg';
import editNavIcon from '../assets/edit-nav.svg';
import deleteIcon from '../assets/delete.svg';
import deleteNavIcon from '../assets/delete-nav.svg';
import './SettingsModal.css';

type SettingsModalProps = {
  onClose: () => void;
};

function SortableCategoryRow({
  category,
  onToggleVisible,
  onDelete,
  onSaveEdit,
}: {
  category: TimerCategory;
  onToggleVisible: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, title: string, color: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(category.title);
  const [editColor, setEditColor] = useState(category.color);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({ id: category.id, disabled: category.is_system });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      onSaveEdit(category.id, editTitle.trim(), editColor);
      setEditing(false);
    }
  };

  const isVisible = category.is_visible;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`category-row ${isDragging ? 'dragging' : ''} ${isOver ? 'drop-target' : ''}`}
    >
      <div className="category-row-dot" style={{ backgroundColor: category.color }} />
      {editing ? (
        <div className="category-row-edit">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="edit-input"
          />
          <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="edit-color" />
          <input
            type="text"
            value={editColor}
            onChange={(e) => setEditColor(e.target.value)}
            className="edit-color-hex"
          />
          <button type="button" onClick={handleSave} className="btn-small">Сохранить</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-small">Отмена</button>
        </div>
      ) : (
        <>
          <span className="category-row-title" style={{ color: category.color }}>
            {category.title}
          </span>
          {!category.is_system && (
            <>
              <button type="button" className="icon-btn-small icon-btn-img" onClick={() => setEditing(true)} aria-label="Изменить">
                <img src={editIcon} alt="" className="icon-img default" />
                <img src={editNavIcon} alt="" className="icon-img hover" />
              </button>
              <button type="button" className="icon-btn-small icon-btn-img" onClick={() => onDelete(category.id)} aria-label="Удалить">
                <img src={deleteIcon} alt="" className="icon-img default" />
                <img src={deleteNavIcon} alt="" className="icon-img hover" />
              </button>
            </>
          )}
          <button
            type="button"
            className="category-eye-btn"
            onClick={() => onToggleVisible(category.id, !isVisible)}
            aria-label={isVisible ? 'Скрыть' : 'Показать'}
          >
            <img src={isVisible ? eyeIcon : eyeoffIcon} alt="" className="icon-img default" />
            <img src={isVisible ? eyeNavIcon : eyeoffNavIcon} alt="" className="icon-img hover" />
          </button>
          {!category.is_system && (
            <button type="button" className="drag-handle" {...attributes} {...listeners} aria-label="Перетащить">
              <GripVertical size={18} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

function CategoryRowHidden({
  category,
  onToggleVisible,
  onDelete,
  onSaveEdit,
}: {
  category: TimerCategory;
  onToggleVisible: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string, title: string, color: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(category.title);
  const [editColor, setEditColor] = useState(category.color);

  const handleSave = () => {
    if (editTitle.trim()) {
      onSaveEdit(category.id, editTitle.trim(), editColor);
      setEditing(false);
    }
  };

  return (
    <div className="category-row">
      <div className="category-row-dot" style={{ backgroundColor: category.color }} />
      {editing ? (
        <div className="category-row-edit">
          <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="edit-input" />
          <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="edit-color" />
          <input type="text" value={editColor} onChange={(e) => setEditColor(e.target.value)} className="edit-color-hex" />
          <button type="button" onClick={handleSave} className="btn-small">Сохранить</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-small">Отмена</button>
        </div>
      ) : (
        <>
          <span className="category-row-title" style={{ color: category.color }}>
            {category.title}
          </span>
          {!category.is_system && (
            <>
              <button type="button" className="icon-btn-small icon-btn-img" onClick={() => setEditing(true)} aria-label="Изменить">
                <img src={editIcon} alt="" className="icon-img default" />
                <img src={editNavIcon} alt="" className="icon-img hover" />
              </button>
              <button type="button" className="icon-btn-small icon-btn-img" onClick={() => onDelete(category.id)} aria-label="Удалить">
                <img src={deleteIcon} alt="" className="icon-img default" />
                <img src={deleteNavIcon} alt="" className="icon-img hover" />
              </button>
            </>
          )}
          <button
            type="button"
            className="category-eye-btn"
            onClick={() => onToggleVisible(category.id, true)}
            aria-label="Показать"
          >
            <img src={eyeoffIcon} alt="" className="icon-img default" />
            <img src={eyeoffNavIcon} alt="" className="icon-img hover" />
          </button>
        </>
      )}
    </div>
  );
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<TimerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState('#666666');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadCategories = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from('timer_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setCategories((data as TimerCategory[]) ?? []);
  };

  useEffect(() => {
    loadCategories().finally(() => setLoading(false));
  }, [user?.id]);

  const handleAdd = async () => {
    if (!user?.id || !newTitle.trim()) return;
    const maxOrder = categories.length ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 0;
    const { error } = await supabase.from('timer_categories').insert({
      user_id: user.id,
      title: newTitle.trim(),
      color: newColor,
      is_visible: true,
      sort_order: maxOrder,
      is_system: false,
    });
    if (error) {
      console.error(error);
      return;
    }
    setNewTitle('');
    setNewColor('#666666');
    loadCategories();
    window.dispatchEvent(new CustomEvent('timer-categories-changed'));
  };

  const handleToggleVisible = async (id: string, visible: boolean) => {
    const { error } = await supabase.from('timer_categories').update({ is_visible: visible }).eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, is_visible: visible } : c)));
    window.dispatchEvent(new CustomEvent('timer-categories-changed'));
  };

  const handleSaveEdit = async (id: string, title: string, color: string) => {
    const { error } = await supabase.from('timer_categories').update({ title, color }).eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, title, color } : c)));
    window.dispatchEvent(new CustomEvent('timer-categories-changed'));
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('timer_categories').delete().eq('id', id);
    if (error) {
      console.error(error);
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    window.dispatchEvent(new CustomEvent('timer-categories-changed'));
  };

  const userCategories = categories.filter((c) => !(c as { is_system?: boolean }).is_system);
  const visibleCategories = userCategories.filter((c) => c.is_visible);
  const hiddenCategories = userCategories.filter((c) => !c.is_visible);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = visibleCategories.findIndex((c) => c.id === active.id);
    const newIndex = visibleCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(visibleCategories, oldIndex, newIndex);
    const systemCat = categories.find((c) => (c as { is_system?: boolean }).is_system);
    const hiddenOrdered = hiddenCategories;
    const newUserOrder = [...reordered, ...hiddenOrdered];
    const newCategories = systemCat ? [systemCat, ...newUserOrder] : newUserOrder;
    setCategories(newCategories);
    await Promise.all(
      newUserOrder.map((c, i) =>
        supabase.from('timer_categories').update({ sort_order: i + 1 }).eq('id', c.id)
      )
    );
    window.dispatchEvent(new CustomEvent('timer-categories-changed'));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Настройки</h2>
          <button type="button" className="modal-close modal-close-img" onClick={onClose} aria-label="Закрыть">
            <img src={closeIcon} alt="" className="icon-img default" />
            <img src={closeNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
        <div className="modal-body">
          <section className="settings-section">
            <h3>Новая категория</h3>
            <div className="add-category-form">
              <input
                type="text"
                placeholder="Заголовок"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="add-input"
              />
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="add-color" />
              <input
                type="text"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                placeholder="#000000"
                className="add-color-hex"
              />
              <button type="button" onClick={handleAdd} className="btn-primary">Добавить</button>
            </div>
          </section>
          {loading ? (
            <p className="muted">Загрузка…</p>
          ) : (
            <>
              <section className="settings-section">
                <h3>Категории таймера</h3>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={visibleCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="category-list">
                      {visibleCategories.map((c) => (
                        <SortableCategoryRow
                          key={c.id}
                          category={c}
                          onToggleVisible={handleToggleVisible}
                          onDelete={handleDelete}
                          onSaveEdit={handleSaveEdit}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </section>
              {hiddenCategories.length > 0 && (
                <section className="settings-section">
                  <h3>Скрытые категории</h3>
                  <div className="category-list">
                    {hiddenCategories.map((c) => (
                      <CategoryRowHidden
                        key={c.id}
                        category={c}
                        onToggleVisible={handleToggleVisible}
                        onDelete={handleDelete}
                        onSaveEdit={handleSaveEdit}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
