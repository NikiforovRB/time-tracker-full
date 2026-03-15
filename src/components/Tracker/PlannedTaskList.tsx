import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { isTodayMoscow } from '../../lib/dateUtils';
import { formatDuration } from '../../lib/dateUtils';
import plusIcon from '../../assets/plus.svg';
import plusNavIcon from '../../assets/plus-nav.svg';
import kvIcon from '../../assets/kv.svg';
import playNavIcon from '../../assets/play-nav.svg';
import editIcon from '../../assets/edit.svg';
import editNavIcon from '../../assets/edit-nav.svg';
import deleteIcon from '../../assets/delete.svg';
import deleteNavIcon from '../../assets/delete-nav.svg';
import type { PlannedTask } from '../../types/db';
import type { TimerCategory } from '../../types/db';
import AddPlannedTaskModal from './AddPlannedTaskModal';
import EditPlannedTaskModal from './EditPlannedTaskModal';
import './PlannedTaskList.css';

type PlannedTaskListProps = {
  plannedTasks: PlannedTask[];
  categories: TimerCategory[];
  selectedDate: Date;
  activeRecord: { planned_task_id?: string | null } | null;
  onTasksChange: () => void;
  onStartFromPlannedTask: (task: PlannedTask) => void;
  hideActiveTask?: boolean;
  onReorder?: (orderedIds: string[]) => void;
};

export default function PlannedTaskList({
  plannedTasks,
  categories,
  selectedDate,
  activeRecord,
  onTasksChange,
  onStartFromPlannedTask,
  hideActiveTask = false,
  onReorder,
}: PlannedTaskListProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>([]);

  const noCategory = categories.find((c) => (c as { is_system?: boolean }).is_system);
  const visibleCategories = categories.filter((c) => c.is_visible);
  const options = noCategory ? [noCategory, ...visibleCategories.filter((c) => !(c as { is_system?: boolean }).is_system)] : visibleCategories;
  const isToday = isTodayMoscow(selectedDate);
  const editingTask = editingTaskId ? plannedTasks.find((t) => t.id === editingTaskId) : null;

  const sortedTasks = [...plannedTasks]
    .filter((t) => !hideActiveTask || t.id !== activeRecord?.planned_task_id)
    .sort((a, b) => a.sort_order - b.sort_order);

  const taskIds = sortedTasks.map((t) => t.id);
  const lastReorderTimeRef = useRef(0);
  useEffect(() => {
    if (Date.now() - lastReorderTimeRef.current < 600) return;
    setOrder(taskIds);
  }, [taskIds.join(',')]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    lastReorderTimeRef.current = Date.now();
    setOrder(newOrder);
    onReorder?.(newOrder);
  };

  const listContent = (
    <ul className="planned-list">
      {(onReorder ? order : taskIds).map((id) => {
        const task = sortedTasks.find((t) => t.id === id);
        if (!task) return null;
        if (onReorder) {
          return (
            <SortablePlannedTaskItem
              key={task.id}
              task={task}
              categories={categories}
              noCategory={noCategory}
              isToday={isToday}
              hasActiveRecord={!!activeRecord}
              onTasksChange={onTasksChange}
              onStart={() => onStartFromPlannedTask(task)}
              onEdit={() => setEditingTaskId(task.id)}
            />
          );
        }
        return (
          <PlannedTaskItem
            key={task.id}
            task={task}
            categories={categories}
            noCategory={noCategory}
            isToday={isToday}
            hasActiveRecord={!!activeRecord}
            onTasksChange={onTasksChange}
            onStart={() => onStartFromPlannedTask(task)}
            onEdit={() => setEditingTaskId(task.id)}
          />
        );
      })}
    </ul>
  );

  return (
    <section className="planned-list-section">
      <div className="planned-list-header">
        <h3>Планируемые задачи</h3>
        <button type="button" className="planned-list-add planned-list-add-img" onClick={() => setAddOpen(true)} aria-label="Добавить задачу">
          <img src={plusIcon} alt="" className="icon-img default" />
          <img src={plusNavIcon} alt="" className="icon-img hover" />
        </button>
      </div>

      {onReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            {listContent}
          </SortableContext>
        </DndContext>
      ) : (
        listContent
      )}

      {addOpen && (
        <AddPlannedTaskModal
          categories={categories}
          selectedDate={selectedDate}
          onClose={() => setAddOpen(false)}
          onAdded={onTasksChange}
        />
      )}

      {editingTask && (
        <EditPlannedTaskModal
          task={editingTask}
          categories={categories}
          onClose={() => setEditingTaskId(null)}
          onSaved={() => {
            onTasksChange();
            setEditingTaskId(null);
          }}
        />
      )}
    </section>
  );
}

type PlannedTaskItemProps = {
  task: PlannedTask;
  categories: TimerCategory[];
  noCategory: TimerCategory | undefined;
  isToday: boolean;
  hasActiveRecord: boolean;
  onTasksChange: () => void;
  onStart: () => void;
  onEdit: () => void;
  asChild?: boolean;
  dragHandle?: React.ReactNode;
};

function SortablePlannedTaskItem(props: PlannedTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const dragHandle = (
    <div className="planned-item-drag-handle" {...attributes} {...listeners} aria-label="Переместить">
      <GripVertical size={16} />
    </div>
  );

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`planned-item ${isDragging ? 'planned-item-dragging' : ''}`}
    >
      <PlannedTaskItem {...props} asChild dragHandle={dragHandle} />
    </li>
  );
}

function PlannedTaskItem({
  task,
  categories,
  noCategory,
  isToday,
  hasActiveRecord,
  onTasksChange,
  onStart,
  onEdit,
  asChild = false,
  dragHandle,
}: PlannedTaskItemProps) {
  const [title, setTitle] = useState(task.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setTitle(task.title);
  }, [task.id, task.title]);

  const adjustTitleHeight = () => {
    const ta = titleRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 24)}px`;
  };
  useEffect(() => {
    adjustTitleHeight();
  }, [title]);
  useEffect(() => {
    const ta = titleRef.current;
    if (!ta) return;
    const ro = new ResizeObserver(() => adjustTitleHeight());
    ro.observe(ta);
    return () => ro.disconnect();
  }, []);

  const selectedCat = task.category_id ? categories.find((c) => c.id === task.category_id) : noCategory;
  const plannedMinutes = task.planned_minutes ?? 0;
  const plannedDurationStr = plannedMinutes > 0 ? formatDuration(plannedMinutes * 60 * 1000) : '';
  const timeLabel = plannedDurationStr ? `Время на задачу: ${plannedDurationStr}` : '';
  const canStart = isToday && plannedMinutes > 0 && (task.category_id || noCategory) && !hasActiveRecord;

  const handleDelete = async () => {
    await supabase.from('planned_tasks').delete().eq('id', task.id);
    onTasksChange();
  };

  const saveTitle = () => {
    const t = title.trim() || 'Новая задача';
    if (t === task.title) return;
    supabase.from('planned_tasks').update({ title: t }).eq('id', task.id).then(() => onTasksChange());
  };

  const row = (
    <div className="planned-item-row1">
        {plannedMinutes > 0 && (
          <button
            type="button"
            className="planned-item-start planned-item-start-img"
            onClick={onStart}
            disabled={!canStart}
            aria-label="Запустить таймер"
          >
            <img src={kvIcon} alt="" className="icon-img default" />
            <img src={playNavIcon} alt="" className="icon-img hover" />
          </button>
        )}
        <div className="planned-item-head">
          <textarea
            ref={titleRef}
            className="planned-item-title planned-item-title-textarea"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onInput={adjustTitleHeight}
            onBlur={saveTitle}
            placeholder="Новая задача"
            rows={1}
          />
          {selectedCat && !(selectedCat as { is_system?: boolean }).is_system && (
            <span className="planned-item-category-inline" style={{ color: selectedCat.color }}>
              {selectedCat.title}
            </span>
          )}
        </div>
        <div className="planned-item-right">
          <button type="button" className="planned-item-edit planned-item-edit-img" onClick={onEdit} aria-label="Редактировать">
            <img src={editIcon} alt="" className="icon-img default" />
            <img src={editNavIcon} alt="" className="icon-img hover" />
          </button>
          <button type="button" className="planned-item-delete planned-item-delete-img" onClick={handleDelete} aria-label="Удалить">
            <img src={deleteIcon} alt="" className="icon-img default" />
            <img src={deleteNavIcon} alt="" className="icon-img hover" />
          </button>
          {timeLabel && <span className="planned-item-time">{timeLabel}</span>}
        </div>
        {dragHandle}
      </div>
  );

  if (asChild) return <>{row}</>;
  return <li className="planned-item">{row}</li>;
}
