import { NavLink, useLocation } from 'react-router-dom';
import { formatDateHeader } from '../../lib/dateUtils';
import leftIcon from '../../assets/left.svg';
import leftNavIcon from '../../assets/left-nav.svg';
import rightIcon from '../../assets/right.svg';
import rightNavIcon from '../../assets/right-nav.svg';
import timelineIcon from '../../assets/timeline.svg';
import timelineNavIcon from '../../assets/timeline-nav.svg';
import zapisiIcon from '../../assets/zapisi.svg';
import zapisiNavIcon from '../../assets/zapisi-nav.svg';
import settingsIcon from '../../assets/settings.svg';
import settingsNavIcon from '../../assets/settings-nav.svg';
import exitIcon from '../../assets/exit.svg';
import exitNavIcon from '../../assets/exit-nav.svg';
import './Header.css';

type HeaderProps = {
  selectedDate: Date;
  onPrevDate: () => void;
  onNextDate: () => void;
  onGoToToday: () => void;
  timelineVisible: boolean;
  completedBlockVisible: boolean;
  onToggleTimeline: () => void;
  onToggleCompletedBlock: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
};

function IconBtn({
  icon,
  iconHover,
  label,
  title,
  onClick,
}: {
  icon: string;
  iconHover: string;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="icon-btn icon-btn-img" onClick={onClick} aria-label={label} title={title}>
      <img src={icon} alt="" className="icon-img default" />
      <img src={iconHover} alt="" className="icon-img hover" />
    </button>
  );
}

export default function Header({
  selectedDate,
  onPrevDate,
  onNextDate,
  onGoToToday,
  timelineVisible,
  completedBlockVisible,
  onToggleTimeline,
  onToggleCompletedBlock,
  onOpenSettings,
  onLogout,
}: HeaderProps) {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';
  const dateLabel = formatDateHeader(selectedDate);

  return (
    <header className="app-header">
      <div className="header-row-first">
        <nav className="header-tabs">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Трекер
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
            Аналитика
          </NavLink>
        </nav>
        <div className="header-actions">
          <IconBtn
            icon={timelineIcon}
            iconHover={timelineNavIcon}
            label={timelineVisible ? 'Скрыть таймлайн' : 'Показать таймлайн'}
            title={timelineVisible ? 'Скрыть таймлайн' : 'Показать таймлайн'}
            onClick={onToggleTimeline}
          />
          <IconBtn
            icon={zapisiIcon}
            iconHover={zapisiNavIcon}
            label={completedBlockVisible ? 'Скрыть выполненное' : 'Показать выполненное'}
            title={completedBlockVisible ? 'Скрыть блок с выполненными задачами' : 'Показать блок с выполненными задачами'}
            onClick={onToggleCompletedBlock}
          />
          <IconBtn icon={settingsIcon} iconHover={settingsNavIcon} label="Настройки" title="Настройки" onClick={onOpenSettings} />
          <IconBtn icon={exitIcon} iconHover={exitNavIcon} label="Выйти" title="Выйти" onClick={onLogout} />
        </div>
      </div>
      {!isAnalytics && (
        <div className="header-date-row">
          <button type="button" className="header-date-nav header-date-nav-img" onClick={onPrevDate} aria-label="Предыдущая дата">
            <img src={leftIcon} alt="" className="icon-img default" />
            <img src={leftNavIcon} alt="" className="icon-img hover" />
          </button>
          <button type="button" className="header-date-btn" onClick={onGoToToday} aria-label="Перейти к сегодня">
            {dateLabel}
          </button>
          <button type="button" className="header-date-nav header-date-nav-img" onClick={onNextDate} aria-label="Следующая дата">
            <img src={rightIcon} alt="" className="icon-img default" />
            <img src={rightNavIcon} alt="" className="icon-img hover" />
          </button>
        </div>
      )}
    </header>
  );
}
