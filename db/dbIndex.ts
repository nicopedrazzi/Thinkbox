import { app } from 'electron';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDb() {
  const db = await open({
    filename: path.join(app.getPath('userData'), 'thinkbox.db'),
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      modified_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id INTEGER,
  category TEXT NOT NULL CHECK (category IN ('work','personal','shopping','idea','todo','other')),
  should_create_reminder INTEGER NOT NULL CHECK (should_create_reminder IN (0,1)),
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
  should_create_reminder INTEGER NOT NULL CHECK (should_create_reminder IN (0,1)),
  reminder_title TEXT,
  reminder_text TEXT,
  reminder_date TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('low','medium','high')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL)
  `);
  
  return db;
}
