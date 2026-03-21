import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { initDb } from '../db/dbIndex';

type savedNote = {
  id: number;
  content: string;
  createdAt: string;
};

let dbPromise: ReturnType<typeof initDb> | undefined;

const getDb = () => dbPromise ??= initDb();


const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

ipcMain.handle('notes:save', async (_event, content: unknown): Promise<savedNote> => {
  if (typeof content !== 'string') {
    throw new Error('Invalid note content.');
  }

  const trimmedContent = content.trim();
  if (!trimmedContent) {
    throw new Error('Please write something before sending.');
  }

  const db = await getDb();
  const result = await db.run('INSERT INTO notes (content) VALUES (?)', trimmedContent);
  const savedNote = await db.get<{ id: number; content: string; created_at: string }>(
    'SELECT id, content, created_at FROM notes WHERE id = ?',
    result.lastID,
  );

  if (!savedNote) {
    throw new Error('Failed to save note.');
  }

  return {
    id: savedNote.id,
    content: savedNote.content,
    createdAt: savedNote.created_at,
  };
});

ipcMain.handle('notes:show', async (): Promise<savedNote[]> => {
  const db = await getDb();
  const rows = await db.all<Array<{ id: number; content: string; created_at: string }>>(
    `
      SELECT id, content, created_at
      FROM notes
      WHERE date(created_at, 'localtime') = date('now', 'localtime')
      ORDER BY id DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
  }));
});

app
  .whenReady()
  .then(async () => {
    await getDb();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error('App startup failed:', error);
    app.quit();
  });

app.on('before-quit', () => {
  if (!dbPromise) {
    return;
  }

  void dbPromise
    .then((db) => db.close())
    .catch((error: unknown) => console.error('Failed to close database:', error));
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
