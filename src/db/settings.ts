import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_REMINDERS, RemindersConfig } from '../constants/reminders';
import { notifyDataChanged } from './changes';

const REMINDERS_KEY = 'reminders';

export async function getRemindersConfig(db: SQLiteDatabase): Promise<RemindersConfig> {
    const row = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM settings WHERE key = ?`,
        [REMINDERS_KEY]
    );
    if (!row) return DEFAULT_REMINDERS;

    try {
        const parsed = JSON.parse(row.value);
        return {
            morning: { ...DEFAULT_REMINDERS.morning, ...parsed.morning },
            afternoon: { ...DEFAULT_REMINDERS.afternoon, ...parsed.afternoon },
            evening: { ...DEFAULT_REMINDERS.evening, ...parsed.evening },
        };
    } catch {
        return DEFAULT_REMINDERS;
    }
}

export async function saveRemindersConfig(db: SQLiteDatabase, config: RemindersConfig) {
    await db.runAsync(
        `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
        [REMINDERS_KEY, JSON.stringify(config)]
    );
    notifyDataChanged(); // reprograma los avisos con la nueva configuración
}