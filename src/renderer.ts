import './index.css';
import trashcanIcon from './assets/trashcan.svg';
import modifyIcon from './assets/modify.svg';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const showButton = document.querySelector<HTMLButtonElement>('#show-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');
const notesBody = document.querySelector<HTMLTableSectionElement>('#notes-tbody');
const remindersBody = document.querySelector<HTMLTableSectionElement>('#reminders-tbody');
const aiGeneratorBtn = document.querySelector<HTMLButtonElement>('#gen-btn');
let editingNoteId: number | null = null;

const resetComposerToCreateMode = () => {
  editingNoteId = null;

  if (sendButton) {
    sendButton.textContent = 'Send';
  }
};

const setComposerToEditMode = (noteId: number, content: string) => {
  if (!note || !sendButton || !status) {
    return;
  }

  editingNoteId = noteId;
  note.value = content;
  note.focus();
  sendButton.textContent = 'Save changes';
  status.textContent = `Editing note #${noteId}.`;
};

const formatDate = (isoDate: string): string => new Date(isoDate).toLocaleString();
const formatReminderDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return '—';
  }
  const parsedDate = new Date(isoDate);
  return Number.isNaN(parsedDate.getTime()) ? isoDate : parsedDate.toLocaleString();
};

const renderNotes = (savedNotes: SavedNote[]) => {
  if (!notesBody) {
    return;
  }

  notesBody.innerHTML = '';

  for (const savedNote of savedNotes) {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = String(savedNote.id);

    const contentCell = document.createElement('td');
    contentCell.className = 'note-content-cell';
    contentCell.textContent = savedNote.content;

    const createdAtCell = document.createElement('td');
    createdAtCell.textContent = formatDate(savedNote.createdAt);

    const actionsCell = document.createElement('td');

    const modifyButton = document.createElement('button');
    modifyButton.type = 'button';
    modifyButton.className = 'note-action-btn modify-note-btn';
    modifyButton.dataset.noteId = String(savedNote.id);
    modifyButton.setAttribute('aria-label', `Modify note ${savedNote.id}`);

    const modifyImage = document.createElement('img');
    modifyImage.src = modifyIcon;
    modifyImage.alt = '';
    modifyButton.append(modifyImage);

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'note-action-btn delete-note-btn';
    deleteButton.dataset.noteId = String(savedNote.id);
    deleteButton.setAttribute('aria-label', `Delete note ${savedNote.id}`);

    const deleteImage = document.createElement('img');
    deleteImage.src = trashcanIcon;
    deleteImage.alt = '';
    deleteButton.append(deleteImage);

    actionsCell.append(modifyButton, deleteButton);
    row.append(idCell, contentCell, createdAtCell, actionsCell);
    notesBody.append(row);
  }
};

const renderReminders = (savedReminders: SavedReminder[]) => {
  if (!remindersBody) {
    return;
  }

  remindersBody.innerHTML = '';

  for (const reminder of savedReminders) {
    const row = document.createElement('tr');
    const reminderText = reminder.reminderText ?? '';
    const reminderTitle = reminder.reminderTitle ?? '—';
    const noteIdLabel = reminder.noteId === null ? '—' : String(reminder.noteId);

    row.innerHTML = `
      <td>${noteIdLabel}</td>
      <td>${reminder.category}</td>
      <td>${reminder.priority}</td>
      <td>
        <strong>${reminderTitle}</strong>
        ${reminderText ? `<div>${reminderText}</div>` : ''}
      </td>
      <td>${formatReminderDate(reminder.reminderDate)}</td>
    `;

    remindersBody.append(row);
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

const loadReminders = async () => {
  if (!status) {
    return;
  }

  try {
    const reminders = await window.thinkbox.showReminders();
    renderReminders(reminders);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Failed to load reminders.';
    status.textContent = messageText;
  }
};

if (note && sendButton && status) {
  resetComposerToCreateMode();

  const sendNote = async () => {
    const message = note.value.trim();

    if (!message) {
      status.textContent =
        editingNoteId === null
          ? 'Write something before sending.'
          : 'Write something before saving.';
      return;
    }

    sendButton.disabled = true;
    status.textContent =
      editingNoteId === null ? 'Saving...' : `Updating note #${editingNoteId}...`;

    try {
      if (editingNoteId === null) {
        const savedNote = await window.thinkbox.saveNote(message);
        status.textContent = `Saved note #${savedNote.id}.`;
      } else {
        const updatedNote = await window.thinkbox.updateNote(editingNoteId, message);
        await loadNotes();
        status.textContent = `Updated note #${updatedNote.id}.`;
      }

      note.value = '';
      note.focus();
      resetComposerToCreateMode();
    } catch (error) {
      const fallbackMessage =
        editingNoteId === null ? 'Failed to save note.' : 'Failed to update note.';
      const messageText = error instanceof Error ? error.message : fallbackMessage;
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
    await loadReminders();
    showButton.disabled = false;
  };

  showButton.addEventListener('click', () => {
    void showNote();
  });
}

if (aiGeneratorBtn && status) {
  const generateReminders = async () => {
    aiGeneratorBtn.disabled = true;
    status.textContent = 'Creating reminders…';

    try {
      const reminders = await window.thinkbox.generateNote();
      await loadReminders();

      if (reminders.length === 0) {
        status.textContent = 'Nothing new to add.';
      } else {
        status.textContent = `${reminders.length} reminders created.`;
      }
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? error.message
          : 'Something went wrong while creating reminders.';
    } finally {
      aiGeneratorBtn.disabled = false;
    }
  };

  aiGeneratorBtn.addEventListener('click', () => {
    void generateReminders();
  });
}

if (status) {
  void loadNotes();
  void loadReminders();
}

if (notesBody && status) {
  notesBody.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const modifyButton = target.closest<HTMLButtonElement>('button.modify-note-btn');
    if (modifyButton) {
      const noteIdText = modifyButton.dataset.noteId;
      const noteId = noteIdText ? Number(noteIdText) : NaN;
      if (!Number.isInteger(noteId) || noteId <= 0) {
        status.textContent = 'Invalid note id.';
        return;
      }

      const row = modifyButton.closest('tr');
      const contentCell = row?.querySelector<HTMLTableCellElement>('td.note-content-cell');
      const currentContent = contentCell?.textContent ?? '';
      setComposerToEditMode(noteId, currentContent);

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
