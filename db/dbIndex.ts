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

  return db;
}
