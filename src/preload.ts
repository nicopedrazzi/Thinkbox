import { contextBridge, ipcRenderer } from 'electron';

type SavedNote = {
  id: number;
  content: string;
  createdAt: string;
};

contextBridge.exposeInMainWorld('thinkbox', {
  saveNote: (content: string): Promise<SavedNote> => ipcRenderer.invoke('notes:save', content),
  showNote: (): Promise<SavedNote[]> => ipcRenderer.invoke('notes:show'),
  deleteNote: (noteId: number): Promise<{ deleted: boolean }> =>
    ipcRenderer.invoke('notes:delete', noteId),
});
