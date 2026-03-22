import './index.css';
import trashcanIcon from './assets/trashcan.svg';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const showButton = document.querySelector<HTMLButtonElement>('#show-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');
const notesBody = document.querySelector<HTMLTableSectionElement>('#notes-tbody');
const aiGeneratorBtn = document.querySelector<HTMLButtonElement>('#gen-btn');

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
      <td>
        <button type="button" class="delete-note-btn" data-note-id="${savedNote.id}" aria-label="Delete note ${savedNote.id}">
          <img src="${trashcanIcon}" alt="" />
        </button>
      </td>
    `;
    notesBody.append(row);
  }
};

const loadNotes = async () => {
  if (!status) {
    return;
  }

  status.textContent = "Loading today's notes...";

  try {
    const savedNotes = await window.thinkbox.showNote();
    renderNotes(savedNotes);
    status.textContent = `Loaded ${savedNotes.length} note(s).`;
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Failed to load notes.';
    status.textContent = messageText;
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
    await loadNotes();
    showButton.disabled = false;
  };

  showButton.addEventListener('click', () => {
    void showNote();
  });
}

if (notesBody && status) {
  notesBody.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const deleteButton = target.closest<HTMLButtonElement>('button.delete-note-btn');
    if (!deleteButton) {
      return;
    }

    const noteIdText = deleteButton.dataset.noteId;
    const noteId = noteIdText ? Number(noteIdText) : NaN;
    if (!Number.isInteger(noteId) || noteId <= 0) {
      status.textContent = 'Invalid note id.';
      return;
    }

    void (async () => {
      deleteButton.disabled = true;
      status.textContent = `Deleting note #${noteId}...`;

      try {
        const result = await window.thinkbox.deleteNote(noteId);
        if (!result.deleted) {
          status.textContent = `Note #${noteId} was already removed.`;
        } else {
          status.textContent = `Deleted note #${noteId}.`;
        }
        await loadNotes();
      } catch (error) {
        const messageText = error instanceof Error ? error.message : 'Failed to delete note.';
        status.textContent = messageText;
      } finally {
        deleteButton.disabled = false;
      }
    })();
  });
}
