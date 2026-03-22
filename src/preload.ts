import { contextBridge, ipcRenderer } from 'electron';

type SavedNote = {
  id: number;
  content: string;
  createdAt: string;
};

type generatedNote = {
  noteId: number;
  category: "work"|"personal"|"shopping"|"idea"|"todo"|"other" ;
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: "low"|"medium"|"high";
};

type savedReminder = {
  id: number;
  noteId: number | null;
  noteContent: string | null;
  category: "work"|"personal"|"shopping"|"idea"|"todo"|"other" ;
  shouldCreateReminder: boolean;
  reminderTitle: string | null;
  reminderText: string | null;
  reminderDate: string | null;
  priority: "low"|"medium"|"high";
  createdAt: string;
};

contextBridge.exposeInMainWorld('thinkbox', {
  saveNote: (content: string): Promise<SavedNote> => ipcRenderer.invoke('notes:save', content),
  updateNote: (noteId: number, content: string): Promise<SavedNote> =>
    ipcRenderer.invoke('notes:update', noteId, content),
  showNote: (): Promise<SavedNote[]> => ipcRenderer.invoke('notes:show'),
  deleteNote: (noteId: number): Promise<{ deleted: boolean }> =>
    ipcRenderer.invoke('notes:delete', noteId),
  generateNote: (): Promise<generatedNote[]> => ipcRenderer.invoke('notes:generate'),
  showReminders: (): Promise<savedReminder[]> => ipcRenderer.invoke('reminders:show')
});
