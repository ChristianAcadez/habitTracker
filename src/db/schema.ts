// db/schema.ts
import type { SQLiteDatabase } from 'expo-sqlite';

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT NOT NULL DEFAULT (date('now')),
      end_date TEXT
    );

    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      habit_name_snapshot TEXT,
      date TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE SET NULL,
      UNIQUE (habit_id, date)
    );
  `);
}