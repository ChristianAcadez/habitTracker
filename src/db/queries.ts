// db/queries.ts
import type { SQLiteDatabase } from 'expo-sqlite';

export interface Habit {
  id: number;
  name: string;
  description: string | null;
  frequency: string;
  created_at: string;
  end_date: string | null;
}

export interface HabitWithStatus extends Habit {
  completed: boolean;
}

// ---------- Home screen ----------

// Hábitos activos en una fecha específica (respeta created_at / end_date)
export async function getActiveHabits(
  db: SQLiteDatabase,
  date: string // 'YYYY-MM-DD'
): Promise<Habit[]> {
  return db.getAllAsync<Habit>(
    `SELECT * FROM habits
     WHERE created_at <= ?
       AND (end_date IS NULL OR end_date >= ?)
     ORDER BY id ASC`,
    [date, date]
  );
}

// Hábitos de hoy + si ya se marcaron como completados
export async function getTodayHabitsWithStatus(
  db: SQLiteDatabase,
  date: string
): Promise<HabitWithStatus[]> {
  return db.getAllAsync<HabitWithStatus>(
    `SELECT h.*, COALESCE(r.completed, 0) as completed
     FROM habits h
     LEFT JOIN records r ON r.habit_id = h.id AND r.date = ?
     WHERE h.created_at <= ?
       AND (h.end_date IS NULL OR h.end_date >= ?)
     ORDER BY h.id ASC`,
    [date, date, date]
  );
}

// Marca/desmarca un hábito para una fecha (upsert)
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

export async function createHabit(
  db: SQLiteDatabase,
  name: string,
  description: string | null,
  frequency: string = 'daily',
  endDate: string | null = null
) {
  await db.runAsync(
    `INSERT INTO habits (name, description, frequency, end_date) VALUES (?, ?, ?, ?)`,
    [name, description, frequency, endDate]
  );
}

export async function completeHabit(
  db: SQLiteDatabase,
  habitId: number,
  today: string
) {
  await db.runAsync(`UPDATE habits SET end_date = ? WHERE id = ?`, [today, habitId]);
}

// ---------- Calendar screen ----------

export type DayStatus = 'complete' | 'partial' | 'none';

export interface DaySummary {
  date: string;
  status: DayStatus;
}

// Para cada día del mes: cuántos hábitos activos había vs cuántos se completaron
// db/queries.ts — reemplaza la función getMonthSummary anterior por esta

export async function getMonthSummary(
  db: SQLiteDatabase,
  year: number,
  month: number, // 1-12
  today: string // 'YYYY-MM-DD', para no colorear días futuros
): Promise<DaySummary[]> {
  const monthStr = String(month).padStart(2, '0');
  const start = `${year}-${monthStr}-01`;
  const lastDayOfMonth = new Date(year, month, 0).getDate(); // día 0 del mes siguiente = último día de este
  const monthEnd = `${year}-${monthStr}-${String(lastDayOfMonth).padStart(2, '0')}`;
  const end = monthEnd < today ? monthEnd : today; // no generar días futuros

  if (start > end) return []; // mes completamente en el futuro

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
          WHERE h.created_at <= d.date
            AND (h.end_date IS NULL OR h.end_date >= d.date)) as active_count,
       (SELECT COUNT(*) FROM records r
          WHERE r.date = d.date AND r.completed = 1) as completed_count
     FROM dates d
     ORDER BY d.date ASC`,
    [start, end]
  );

  return rows.map((row) => {
    let status: DayStatus = 'none';
    if (row.active_count > 0 && row.completed_count >= row.active_count) {
      status = 'complete';
    } else if (row.completed_count > 0) {
      status = 'partial';
    }
    return { date: row.date, status };
  });
}

// ---------- Progress screen ----------

// Racha total: días consecutivos hacia atrás desde hoy con 100% de hábitos activos cumplidos
export async function getTotalStreak(
  db: SQLiteDatabase,
  today: string
): Promise<number> {
  let streak = 0;
  let cursor = today;

  while (true) {
    const active = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM habits
       WHERE created_at <= ? AND (end_date IS NULL OR end_date >= ?)`,
      [cursor, cursor]
    );
    if (!active || active.count === 0) break; // no había hábitos ese día, se corta la racha

    const completed = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM records WHERE date = ? AND completed = 1`,
      [cursor]
    );
    if (!completed || completed.count < active.count) break;

    streak++;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

// Racha por hábito: días consecutivos con completed = 1 en records
export async function getHabitStreak(
  db: SQLiteDatabase,
  habitId: number,
  today: string
): Promise<number> {
  let streak = 0;
  let cursor = today;

  while (true) {
    const row = await db.getFirstAsync<{ completed: number }>(
      `SELECT completed FROM records WHERE habit_id = ? AND date = ?`,
      [habitId, cursor]
    );
    if (!row || row.completed !== 1) break;

    streak++;
    cursor = shiftDate(cursor, -1);
  }

  return streak;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getAllHabits(db: SQLiteDatabase): Promise<Habit[]> {
  return db.getAllAsync<Habit>(`SELECT * FROM habits ORDER BY created_at ASC`);
}

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
       SUM((SELECT COUNT(*) FROM habits h
              WHERE h.created_at <= d.date
                AND (h.end_date IS NULL OR h.end_date >= d.date))) as total_active,
       SUM((SELECT COUNT(*) FROM records r
              WHERE r.date = d.date AND r.completed = 1)) as total_completed
     FROM dates d`,
    [start, end]
  );

  if (!row || !row.total_active) return 0;
  return Math.round((row.total_completed / row.total_active) * 100);
}