import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 3;

export async function initDatabase(db: SQLiteDatabase) {
  await db.execAsync(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = result?.user_version ?? 0;
  if (version >= DATABASE_VERSION) return;

  if (version < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        frequency TEXT NOT NULL DEFAULT 'daily',
        created_at TEXT NOT NULL DEFAULT (date('now', 'localtime')),
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
    version = 1;
  }

  if (version < 2) {
    await db.execAsync(`
      ALTER TABLE habits ADD COLUMN active_weekdays TEXT NOT NULL DEFAULT '0,1,2,3,4,5,6';
    `);
  }

  if (version < 3) {
    await db.execAsync(`
    ALTER TABLE habits ADD COLUMN time_of_day TEXT NOT NULL DEFAULT 'anytime';
  `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION};`);
}