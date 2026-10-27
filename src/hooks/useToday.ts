import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getTodayString } from '../utils/date';

function msUntilNextMidnight(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

export function useToday(): string {
  const [today, setToday] = useState(getTodayString());

  useEffect(() => {
    function refresh() {
      setToday((current) => {
        const next = getTodayString();
        return next === current ? current : next;
      });
    }

    // cuando la app vuelve a primer plano
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    // cuando la app sigue abierta y cruza la medianoche
    let timeout: ReturnType<typeof setTimeout>;
    function scheduleMidnightRefresh() {
      timeout = setTimeout(() => {
        refresh();
        scheduleMidnightRefresh();
      }, msUntilNextMidnight());
    }
    scheduleMidnightRefresh();

    return () => {
      subscription.remove();
      clearTimeout(timeout);
    };
  }, []);

  return today;
}