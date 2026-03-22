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

interface ThinkboxApi {
  saveNote: (content: string) => Promise<SavedNote>;
  showNote: () => Promise<SavedNote[]>;
  deleteNote: (noteId: number) => Promise<{ deleted: boolean }>;
  generateNote: () => Promise<GeneratedReminder[]>;
}

interface Window {
  thinkbox: ThinkboxApi;
}
