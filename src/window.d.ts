type SavedNote = {
  id: number;
  content: string;
  createdAt: string;
};

type GeneratedReminder = {
  noteId: number;
  category: 'work' | 'personal' | 'shopping' | 'idea' | 'todo' | 'other';
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: 'low' | 'medium' | 'high';
};

type SavedReminder = {
  id: number;
  noteId: number | null;
  noteContent: string | null;
  category: 'work' | 'personal' | 'shopping' | 'idea' | 'todo' | 'other';
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
};

type SavedTodo = {
  id: number;
  noteId: number | null;
  noteContent: string | null;
  isCompleted: boolean;
  category: 'work' | 'personal' | 'shopping' | 'idea' | 'todo' | 'other';
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
};

interface ThinkboxApi {
  markAsDone: (todoId: number) => Promise<{ completed: boolean }>;
  saveNote: (content: string) => Promise<SavedNote>;
  updateNote: (noteId: number, content: string) => Promise<SavedNote>;
  showNote: () => Promise<SavedNote[]>;
  deleteNote: (noteId: number) => Promise<{ deleted: boolean }>;
  generateNote: () => Promise<GeneratedReminder[]>;
  showReminders: () => Promise<SavedReminder[]>;
  showTodos: () => Promise<SavedTodo[]>;
  showTodosWindow: () => Promise<{ shown: boolean }>;
}

interface Window {
  thinkbox: ThinkboxApi;
}
