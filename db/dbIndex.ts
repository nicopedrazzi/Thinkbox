import { app } from 'electron';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const hasColumn = async (db: Awaited<ReturnType<typeof open>>, table: string, column: string): Promise<boolean> => {
  const rows = await db.all<Array<{ name: string }>>(`PRAGMA table_info(${table})`);
  return rows.some((row) => row.name === column);
};

const migrateShouldCreateReminderColumns = async (db: Awaited<ReturnType<typeof open>>): Promise<void> => {
  const remindersHasLegacyColumn = await hasColumn(db, 'reminders', 'should_create_reminder');
  const todosHasLegacyColumn = await hasColumn(db, 'todos', 'should_create_reminder');

  if (!remindersHasLegacyColumn && !todosHasLegacyColumn) {
    return;
  }

  await db.exec('PRAGMA foreign_keys = OFF');
  await db.exec('BEGIN TRANSACTION');

  try {
    if (remindersHasLegacyColumn) {
      await db.exec(`
        CREATE TABLE reminders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          note_id INTEGER,
          category TEXT NOT NULL CHECK (category IN ('work','personal','shopping','idea','todo','other')),
          reminder_title TEXT,
          reminder_text TEXT,
          reminder_date TEXT,
          priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
        )
      `);

      await db.exec(`
        INSERT INTO reminders_new (
          id,
          note_id,
          category,
          reminder_title,
          reminder_text,
          reminder_date,
          priority,
          created_at
        )
        SELECT
          id,
          note_id,
          category,
          reminder_title,
          reminder_text,
          reminder_date,
          priority,
          created_at
        FROM reminders
      `);

      await db.exec('DROP TABLE reminders');
      await db.exec('ALTER TABLE reminders_new RENAME TO reminders');
    }

    if (todosHasLegacyColumn) {
      await db.exec(`
        CREATE TABLE todos_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          note_id INTEGER,
          is_completed BOOLEAN,
          category TEXT NOT NULL CHECK (category IN ('work','personal','shopping','idea','todo','other')),
          reminder_title TEXT,
          reminder_text TEXT,
          reminder_date TEXT,
          priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
        )
      `);

      await db.exec(`
        INSERT INTO todos_new (
          id,
          note_id,
          is_completed,
          category,
          reminder_title,
          reminder_text,
          reminder_date,
          priority,
          created_at
        )
        SELECT
          id,
          note_id,
          is_completed,
          category,
          reminder_title,
          reminder_text,
          reminder_date,
          priority,
          created_at
        FROM todos
      `);

      await db.exec('DROP TABLE todos');
      await db.exec('ALTER TABLE todos_new RENAME TO todos');
    }

    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  } finally {
    await db.exec('PRAGMA foreign_keys = ON');
  }
};

const migrateGeneratedNoteFlag = async (db: Awaited<ReturnType<typeof open>>): Promise<void> => {
  const notesHasGeneratedColumn = await hasColumn(db, 'notes', 'is_generated');
  if (!notesHasGeneratedColumn) {
    await db.exec('ALTER TABLE notes ADD COLUMN is_generated INTEGER NOT NULL DEFAULT 0');
  }

  await db.exec(`
    UPDATE notes
    SET is_generated = 1
    WHERE EXISTS (
      SELECT 1
      FROM reminders AS r
      WHERE r.note_id = notes.id
    )
  `);
};

export async function initDb() {
  const db = await open({
    filename: path.join(app.getPath('userData'), 'thinkbox.db'),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      is_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      modified_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER,
  category TEXT NOT NULL CHECK (category IN ('work','personal','shopping','idea','todo','other')),
  reminder_title TEXT,
  reminder_text TEXT,
  reminder_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL)
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER,
  is_completed BOOLEAN,
  category TEXT NOT NULL CHECK (category IN ('work','personal','shopping','idea','todo','other')),
  reminder_title TEXT,
  reminder_text TEXT,
  reminder_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL)
  `);

  await migrateShouldCreateReminderColumns(db);
  await migrateGeneratedNoteFlag(db);
  
  return db;
}
