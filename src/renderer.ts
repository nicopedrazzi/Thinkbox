import './index.css';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const showButton = document.querySelector<HTMLButtonElement>('#show-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');
const notesBody = document.querySelector<HTMLTableSectionElement>('#notes-tbody');

const formatDate = (isoDate: string): string => new Date(isoDate).toLocaleString();

const renderNotes = (savedNotes: SavedNote[]) => {
  if (!notesBody) {
    return;
  }

  notesBody.innerHTML = '';

  for (const savedNote of savedNotes) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${savedNote.id}</td>
      <td>${savedNote.content}</td>
      <td>${formatDate(savedNote.createdAt)}</td>
    `;
    notesBody.append(row);
  }
};

if (note && sendButton && status) {
  const sendNote = async () => {
    const message = note.value.trim();

    if (!message) {
      status.textContent = 'Write something before sending.';
      return;
    }

    sendButton.disabled = true;
    status.textContent = 'Saving...';

    try {
      const savedNote = await window.thinkbox.saveNote(message);
      status.textContent = `Saved note #${savedNote.id}.`;
      note.value = '';
      note.focus();
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to save note.';
      status.textContent = messageText;
    } finally {
      sendButton.disabled = false;
    }
  };

  sendButton.addEventListener('click', () => {
    void sendNote();
  });

  note.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void sendNote();
    }
  });
}

if (showButton && status) {
  const showNote = async () => {
    showButton.disabled = true;
    status.textContent = "Loading today's notes...";

    try {
      const savedNotes = await window.thinkbox.showNote();
      renderNotes(savedNotes);
      status.textContent = `Loaded ${savedNotes.length} note(s).`;
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Failed to load notes.';
      status.textContent = messageText;
    } finally {
      showButton.disabled = false;
    }
  };

  showButton.addEventListener('click', () => {
    void showNote();
  });
}
