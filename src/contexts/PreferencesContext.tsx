import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { UserPreferences } from '../types/db';
import { useAuth } from './AuthContext';

type PreferencesContextValue = {
  prefs: UserPreferences | null;
  loading: boolean;
  setTimelineVisible: (v: boolean) => Promise<void>;
  setCompletedTasksBlockVisible: (v: boolean) => Promise<void>;
  setTimelineStartHour: (h: number) => Promise<void>;
  setTimelineEndHour: (h: number) => Promise<void>;
};

const defaultPrefs: UserPreferences = {
  user_id: '',
  timeline_start_hour: 0,
  timeline_end_hour: 24,
  timeline_visible: true,
  completed_tasks_block_visible: true,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setPrefs({ ...defaultPrefs, user_id: user.id });
        } else {
          setPrefs((data as UserPreferences) ?? { ...defaultPrefs, user_id: user.id });
        }
        setLoading(false);
      });
  }, [user?.id]);

  const update = useCallback(
    async (patch: Partial<Omit<UserPreferences, 'user_id'>>) => {
      if (!user?.id) return;
      setPrefs((prev) => (prev ? { ...prev, ...patch } : null));
      await supabase.from('user_preferences').upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
    },
    [user?.id]
  );

  const value: PreferencesContextValue = {
    prefs,
    loading,
    setTimelineVisible: (v) => update({ timeline_visible: v }),
    setCompletedTasksBlockVisible: (v) => update({ completed_tasks_block_visible: v }),
    setTimelineStartHour: (h) => update({ timeline_start_hour: h }),
    setTimelineEndHour: (h) => update({ timeline_end_hour: h }),
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
