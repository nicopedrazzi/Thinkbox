import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import { initDb } from '../db/dbIndex';
import { classifyWithLocalModel } from '../scripts/aiScript';
import { stopModelRuntime } from '../scripts/modelStuff';

type savedNote = {
  id: number;
  content: string;
  createdAt: string;
};

type GeneratedReminder = Awaited<ReturnType<typeof classifyWithLocalModel>> & {
  noteId: number;
};

type savedReminder = {
  id: number;
  noteId: number | null;
  noteContent: string | null;
  category: GeneratedReminder['category'];
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: GeneratedReminder['priority'];
  createdAt: string;
};

type savedTodo = {
  id: number;
  noteId: number | null;
  noteContent: string | null;
  isCompleted: boolean;
  category: GeneratedReminder['category'];
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: GeneratedReminder['priority'];
  createdAt: string;
};

let dbPromise: ReturnType<typeof initDb> | undefined;
let todosWindow: BrowserWindow | null = null;

const getDb = () => dbPromise ??= initDb();


const createWindow = () => {
  const win = new BrowserWindow({
    width: 430,
    height: 900,
    minWidth: 430,
    minHeight: 760,
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

const createTodosWindow = (): BrowserWindow => {
  if (todosWindow && !todosWindow.isDestroyed()) {
    return todosWindow;
  }

  const win = new BrowserWindow({
    width: 420,
    height: 720,
    minWidth: 360,
    minHeight: 540,
    show: false,
    title: 'ThinkBox Todo List',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const todosUrl = new URL('todos.html', `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/`).toString();
    void win.loadURL(todosUrl);
  } else {
    void win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/todos.html`));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    todosWindow = null;
  });

  todosWindow = win;
  return win;
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

ipcMain.handle('notes:update', async (_event,noteId: unknown,content: unknown,
  ): Promise<savedNote> => {
    if (typeof noteId !== 'number' || !Number.isInteger(noteId) || noteId <= 0) {
      throw new Error('Invalid note id.');
    }

    if (typeof content !== 'string') {
      throw new Error('Invalid note content.');
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new Error('Please write something before saving.');
    }

    const db = await getDb();
    const updateResult = await db.run(
      `
        UPDATE notes
        SET content = ?, modified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      trimmedContent,
      noteId,
    );

    if (updateResult.changes === 0) {
      throw new Error(`Note #${noteId} was not found.`);
    }

    const updatedNote = await db.get<{ id: number; content: string; created_at: string }>(
      'SELECT id, content, created_at FROM notes WHERE id = ?',
      noteId,
    );

    if (!updatedNote) {
      throw new Error('Failed to update note.');
    }

    return {
      id: updatedNote.id,
      content: updatedNote.content,
      createdAt: updatedNote.created_at,
    };
  },
);

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

ipcMain.handle('notes:delete', async (_event, noteId: unknown): Promise<{ deleted: boolean }> => {
  if (typeof noteId !== 'number' || !Number.isInteger(noteId) || noteId <= 0) {
    throw new Error('Invalid note id.');
  }

  const db = await getDb();
  const result = await db.run('DELETE FROM notes WHERE id = ?', noteId);

  return { deleted: result.changes > 0 };
});


ipcMain.handle('notes:generate', async (): Promise<GeneratedReminder[]> => {
  try {
    const db = await getDb();
    const notesWithoutReminders = await db.all<Array<{ id: number; content: string }>>(
      `
        SELECT n.id, n.content
        FROM notes AS n
        LEFT JOIN reminders AS r ON r.note_id = n.id
        WHERE r.note_id IS NULL
        ORDER BY n.id ASC
      `,
    );

    const generatedReminders: GeneratedReminder[] = [];

    for (const note of notesWithoutReminders) {
      const reminder = await classifyWithLocalModel(note.content);

      await db.run(
        `
          INSERT INTO reminders (
            note_id,
            category,
            should_create_reminder,
            reminder_title,
            reminder_text,
            reminder_date,
            priority
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        note.id,
        reminder.category,
        reminder.shouldCreateReminder ? 1 : 0,
        reminder.reminderTitle,
        reminder.reminderText,
        reminder.reminderDate,
        reminder.priority,
      );

      generatedReminders.push({
        noteId: note.id,
        ...reminder,
      });
    }

    return generatedReminders;
  } finally {
    stopModelRuntime();
  }
});

ipcMain.handle('reminders:show', async (): Promise<savedReminder[]> => {
  const db = await getDb();
  const rows = await db.all<Array<{
    id: number;
    note_id: number | null;
    note_content: string | null;
    category: GeneratedReminder['category'];
    should_create_reminder: number;
    reminder_title: string | null;
    reminder_text: string | null;
    reminder_date: string | null;
    priority: GeneratedReminder['priority'];
    created_at: string;
  }>>(
    `
      SELECT
        r.id,
        r.note_id,
        n.content AS note_content,
        r.category,
        r.should_create_reminder,
        r.reminder_title,
        r.reminder_text,
        r.reminder_date,
        r.priority,
        r.created_at
      FROM reminders AS r
      LEFT JOIN notes AS n ON n.id = r.note_id
      ORDER BY r.id DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    noteId: row.note_id,
    noteContent: row.note_content,
    category: row.category,
    shouldCreateReminder: row.should_create_reminder === 1,
    reminderTitle: row.reminder_title,
    reminderText: row.reminder_text,
    reminderDate: row.reminder_date,
    priority: row.priority,
    createdAt: row.created_at,
  }));
});

ipcMain.handle('todos:show', async (): Promise<savedTodo[]> => {
  const db = await getDb();

  await db.run(
    `
      INSERT INTO todos (
        note_id,
        is_completed,
        category,
        should_create_reminder,
        reminder_title,
        reminder_text,
        reminder_date,
        priority
      )
      SELECT
        r.note_id,
        0,
        r.category,
        r.should_create_reminder,
        r.reminder_title,
        r.reminder_text,
        r.reminder_date,
        r.priority
      FROM reminders AS r
      WHERE r.should_create_reminder = 1
        AND r.note_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM todos AS t
          WHERE t.note_id = r.note_id
        )
    `,
  );

  const rows = await db.all<Array<{
    id: number;
    note_id: number | null;
    note_content: string | null;
    is_completed: number | null;
    category: GeneratedReminder['category'];
    should_create_reminder: number;
    reminder_title: string | null;
    reminder_text: string | null;
    reminder_date: string | null;
    priority: GeneratedReminder['priority'];
    created_at: string;
  }>>(
    `
      SELECT
        t.id,
        t.note_id,
        n.content AS note_content,
        COALESCE(t.is_completed, 0) AS is_completed,
        t.category,
        t.should_create_reminder,
        t.reminder_title,
        t.reminder_text,
        t.reminder_date,
        t.priority,
        t.created_at
      FROM todos AS t
      LEFT JOIN notes AS n ON n.id = t.note_id
      WHERE COALESCE(t.is_completed, 0) = 0
      ORDER BY t.id DESC
    `,
  );

  return rows.map((row) => ({
    id: row.id,
    noteId: row.note_id,
    noteContent: row.note_content,
    isCompleted: row.is_completed === 1,
    category: row.category,
    shouldCreateReminder: row.should_create_reminder === 1,
    reminderTitle: row.reminder_title,
    reminderText: row.reminder_text,
    reminderDate: row.reminder_date,
    priority: row.priority,
    createdAt: row.created_at,
  }));
});

ipcMain.handle('todos:window:show', async (): Promise<{ shown: boolean }> => {
  const win = createTodosWindow();

  if (win.isMinimized()) {
    win.restore();
  }

  win.show();
  win.focus();

  return { shown: true };
});

ipcMain.handle('todos:complete', async (_event, todoId: unknown): Promise<{ completed: boolean }> => {
  if (typeof todoId !== 'number' || !Number.isInteger(todoId) || todoId <= 0) {
    throw new Error('Invalid todo id.');
  }

  const db = await getDb();
  const result = await db.run(
    `
      UPDATE todos
      SET is_completed = 1
      WHERE id = ? AND COALESCE(is_completed, 0) = 0
    `,
    todoId,
  );

  return { completed: (result.changes ?? 0) > 0 };
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
  stopModelRuntime();

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
