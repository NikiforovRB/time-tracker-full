import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { ensureUserSetup } from '../../lib/ensureUserSetup';
import Header from './Header';
import SettingsModal from '../SettingsModal';
import './MainLayout.css';

export default function MainLayout() {
  const { user } = useAuth();
  const { selectedDate, prevDate, nextDate, goToToday } = useApp();
  const { prefs, setTimelineVisible, setCompletedTasksBlockVisible } = usePreferences();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    ensureUserSetup(user.id).catch(console.error);
  }, [user?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const timelineVisible = prefs?.timeline_visible ?? true;
  const completedBlockVisible = prefs?.completed_tasks_block_visible ?? true;

  return (
    <div className="main-layout">
      <Header
        selectedDate={selectedDate}
        onPrevDate={prevDate}
        onNextDate={nextDate}
        onGoToToday={goToToday}
        timelineVisible={timelineVisible}
        completedBlockVisible={completedBlockVisible}
        onToggleTimeline={() => setTimelineVisible(!timelineVisible)}
        onToggleCompletedBlock={() => setCompletedTasksBlockVisible(!completedBlockVisible)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />
      <main className="main-content">
        <Outlet context={{ timelineVisible, completedBlockVisible }} />
      </main>
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
