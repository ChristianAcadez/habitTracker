import type { SQLiteDatabase } from 'expo-sqlite';
import { getTodayString, toDateString } from '../utils/date';
import { parseWeekdays, serializeWeekdays } from '../utils/weekdays';
import type { TimeOfDay } from '../constants/timeOfDay';

export interface Habit {
  id: number;
  name: string;
  description: string | null;
  active_weekdays: string;
  time_of_day: TimeOfDay;
  created_at: string;
  end_date: string | null;
}

export interface HabitWithStatus extends Habit {
  completed: boolean;
}

export type DayStatus = 'complete' | 'partial' | 'none';

export interface DaySummary {
  date: string;
  status: DayStatus;
}

// Fragmento SQL: el hábito `alias` está programado en la fecha que da `dateExpr`
function isScheduledOn(dateExpr: string, alias: string = 'h'): string {
  return `${alias}.created_at <= ${dateExpr}
    AND (${alias}.end_date IS NULL OR ${alias}.end_date >= ${dateExpr})
    AND instr(',' || ${alias}.active_weekdays || ',', ',' || strftime('%w', ${dateExpr}) || ',') > 0`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

// ---------- Home ----------

export async function getHabitsWithStatusForDate(
  db: SQLiteDatabase,
  date: string
): Promise<HabitWithStatus[]> {
  return db.getAllAsync<HabitWithStatus>(
    `SELECT h.*, COALESCE(r.completed, 0) AS completed
     FROM (SELECT ? AS date) d
     JOIN habits h ON ${isScheduledOn('d.date')}
     LEFT JOIN records r ON r.habit_id = h.id AND r.date = d.date
     ORDER BY h.id ASC`,
    [date]
  );
}

export async function toggleHabitRecord(
  db: SQLiteDatabase,
  habitId: number,
  habitName: string,
  date: string,
  completed: boolean
) {
  await db.runAsync(
    `INSERT INTO records (habit_id, habit_name_snapshot, date, completed)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (habit_id, date)
     DO UPDATE SET completed = excluded.completed`,
    [habitId, habitName, date, completed ? 1 : 0]
  );
}

// ---------- Crear / editar / completar ----------

export async function createHabit(
  db: SQLiteDatabase,
  name: string,
  description: string | null,
  weekdays: number[],
  timeOfDay: TimeOfDay,
  endDate: string | null
) {
  await db.runAsync(
    `INSERT INTO habits (name, description, active_weekdays, time_of_day, created_at, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description, serializeWeekdays(weekdays), timeOfDay, getTodayString(), endDate]
  );
}

export async function updateHabit(
  db: SQLiteDatabase,
  habitId: number,
  name: string,
  description: string | null,
  weekdays: number[],
  timeOfDay: TimeOfDay,
  endDate: string | null
) {
  await db.runAsync(
    `UPDATE habits
     SET name = ?, description = ?, active_weekdays = ?, time_of_day = ?, end_date = ?
     WHERE id = ?`,
    [name, description, serializeWeekdays(weekdays), timeOfDay, endDate, habitId]
  );
}

export async function completeHabit(db: SQLiteDatabase, habitId: number, today: string) {
  await db.runAsync(`UPDATE habits SET end_date = ? WHERE id = ?`, [today, habitId]);
}

export async function getHabitById(db: SQLiteDatabase, habitId: number): Promise<Habit | null> {
  const row = await db.getFirstAsync<Habit>(`SELECT * FROM habits WHERE id = ?`, [habitId]);
  return row ?? null;
}

export async function getAllHabits(db: SQLiteDatabase): Promise<Habit[]> {
  return db.getAllAsync<Habit>(`SELECT * FROM habits ORDER BY created_at ASC`);
}

export async function deleteHabit(db: SQLiteDatabase, habitId: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM records WHERE habit_id = ?`, [habitId]);
    await db.runAsync(`DELETE FROM habits WHERE id = ?`, [habitId]);
  });
}

// ---------- Calendario ----------

export async function getMonthSummary(
  db: SQLiteDatabase,
  year: number,
  month: number,
  today: string
): Promise<DaySummary[]> {
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const end = monthEnd < today ? monthEnd : today;

  if (start > end) return [];

  const rows = await db.getAllAsync<{
    date: string;
    active_count: number;
    completed_count: number;
  }>(
    `WITH RECURSIVE dates(date) AS (
       SELECT date(?)
       UNION ALL
       SELECT date(date, '+1 day') FROM dates WHERE date < date(?)
     )
     SELECT
       d.date,
       (SELECT COUNT(*) FROM habits h
          WHERE ${isScheduledOn('d.date')}) AS active_count,
       (SELECT COUNT(*) FROM habits h
          JOIN records r ON r.habit_id = h.id AND r.date = d.date AND r.completed = 1
          WHERE ${isScheduledOn('d.date')}) AS completed_count
     FROM dates d
     ORDER BY d.date ASC`,
    [start, end]
  );

  return rows
    .filter((row) => row.active_count > 0) // sin hábitos programados ese día = día neutro (gris)
    .map((row) => {
      let status: DayStatus = 'none';
      if (row.completed_count >= row.active_count) {
        status = 'complete';
      } else if (row.completed_count > 0) {
        status = 'partial';
      }
      return { date: row.date, status };
    });
}

// ---------- Progreso ----------

export async function getMonthCompletionRate(
  db: SQLiteDatabase,
  year: number,
  month: number,
  today: string
): Promise<number> {
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const end = monthEnd < today ? monthEnd : today;

  if (start > end) return 0;

  const row = await db.getFirstAsync<{ total_active: number; total_completed: number }>(
    `WITH RECURSIVE dates(date) AS (
       SELECT date(?)
       UNION ALL
       SELECT date(date, '+1 day') FROM dates WHERE date < date(?)
     )
     SELECT
       (SELECT COUNT(*) FROM dates d
          JOIN habits h ON ${isScheduledOn('d.date')}) AS total_active,
       (SELECT COUNT(*) FROM dates d
          JOIN habits h ON ${isScheduledOn('d.date')}
          JOIN records r ON r.habit_id = h.id AND r.date = d.date AND r.completed = 1) AS total_completed`,
    [start, end]
  );

  if (!row || !row.total_active) return 0;
  return Math.round((row.total_completed / row.total_active) * 100);
}

// Racha total: los días sin hábitos programados no cuentan ni rompen la racha
export async function getTotalStreak(db: SQLiteDatabase, today: string): Promise<number> {
  const first = await db.getFirstAsync<{ first_date: string | null }>(
    `SELECT MIN(created_at) AS first_date FROM habits`
  );
  if (!first?.first_date) return 0;

  let streak = 0;
  let cursor = today;

  while (cursor >= first.first_date) {
    const counts = await db.getFirstAsync<{ active: number; completed: number }>(
      `WITH d(date) AS (SELECT ?)
       SELECT
         (SELECT COUNT(*) FROM d JOIN habits h ON ${isScheduledOn('d.date')}) AS active,
         (SELECT COUNT(*) FROM d
            JOIN habits h ON ${isScheduledOn('d.date')}
            JOIN records r ON r.habit_id = h.id AND r.date = d.date AND r.completed = 1) AS completed`,
      [cursor]
    );

    if (counts && counts.active > 0) {
      if (counts.completed >= counts.active) {
        streak++;
      } else if (cursor !== today) {
        break;
      }
    }
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

// Racha por hábito: solo cuentan los días en que ese hábito estaba programado
export async function getHabitStreak(
  db: SQLiteDatabase,
  habitId: number,
  today: string
): Promise<number> {
  const habit = await getHabitById(db, habitId);
  if (!habit) return 0;

  const weekdays = parseWeekdays(habit.active_weekdays);
  let streak = 0;
  let cursor = today;

  while (cursor >= habit.created_at) {
    const weekday = new Date(cursor + 'T00:00:00').getDay();

    if (weekdays.includes(weekday)) {
      const row = await db.getFirstAsync<{ completed: number }>(
        `SELECT completed FROM records WHERE habit_id = ? AND date = ?`,
        [habitId, cursor]
      );

      if (row?.completed === 1) {
        streak++;
      } else if (cursor !== today) {
        break;
      }
    }
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}