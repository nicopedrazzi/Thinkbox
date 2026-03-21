type SavedNote = {
  id: number;
  content: string;
  createdAt: string;
};

interface ThinkboxApi {
  saveNote: (content: string) => Promise<SavedNote>;
  showNote: () => Promise<SavedNote[]>;
  deleteNote: (noteId: number) => Promise<{ deleted: boolean }>;
}

interface Window {
  thinkbox: ThinkboxApi;
}
