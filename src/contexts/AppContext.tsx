import React, { createContext, useContext, useState, useCallback } from 'react';
import { nowInMoscow } from '../lib/dateUtils';

type AppContextValue = {
  selectedDate: Date;
  setSelectedDate: (d: Date | ((prev: Date) => Date)) => void;
  prevDate: () => void;
  nextDate: () => void;
  goToToday: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDateState] = useState<Date>(() => {
    const n = nowInMoscow();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  });

  const setSelectedDate = useCallback((d: Date | ((prev: Date) => Date)) => {
    setSelectedDateState((prev) => {
      const next = typeof d === 'function' ? d(prev) : d;
      return new Date(next.getFullYear(), next.getMonth(), next.getDate());
    });
  }, []);

  const prevDate = useCallback(() => {
    setSelectedDateState((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      return d;
    });
  }, []);

  const nextDate = useCallback(() => {
    setSelectedDateState((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      return d;
    });
  }, []);

  const goToToday = useCallback(() => {
    const n = nowInMoscow();
    setSelectedDateState(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
  }, []);

  return (
    <AppContext.Provider value={{ selectedDate, setSelectedDate, prevDate, nextDate, goToToday }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
