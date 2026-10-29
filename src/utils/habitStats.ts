import type { HabitDay } from '../db/queries';

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  totalCompleted: number;
  completionRate: number;
}

export function computeHabitStats(days: HabitDay[], today: string): HabitStats {
  let run = 0;
  let best = 0;
  let completed = 0;
  let counted = 0;

  for (const day of days) {
    if (day.completed) {
      run++;
      completed++;
      counted++;
      if (run > best) best = run;
    } else if (day.date !== today) {
      run = 0;
      counted++;
    }
  }

  return {
    currentStreak: run,
    bestStreak: best,
    totalCompleted: completed,
    completionRate: counted > 0 ? Math.round((completed / counted) * 100) : 0,
  };
}