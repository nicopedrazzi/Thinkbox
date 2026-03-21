type SavedNote = {
  id: number;
  content: string;
  createdAt: string;
};

interface ThinkboxApi {
  saveNote: (content: string) => Promise<SavedNote>;
  showNote: () => Promise<SavedNote[]>;
}

interface Window {
  thinkbox: ThinkboxApi;
}
