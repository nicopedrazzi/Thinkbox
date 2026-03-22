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

contextBridge.exposeInMainWorld('thinkbox', {
  saveNote: (content: string): Promise<SavedNote> => ipcRenderer.invoke('notes:save', content),
  showNote: (): Promise<SavedNote[]> => ipcRenderer.invoke('notes:show'),
  deleteNote: (noteId: number): Promise<{ deleted: boolean }> =>
    ipcRenderer.invoke('notes:delete', noteId),
  generateNote: (): Promise<generatedNote[]> => ipcRenderer.invoke('notes:generate')
});
