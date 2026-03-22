import './index.css';
import trashcanIcon from './assets/trashcan.svg';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const showButton = document.querySelector<HTMLButtonElement>('#show-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');
const notesBody = document.querySelector<HTMLTableSectionElement>('#notes-tbody');
const remindersBody = document.querySelector<HTMLTableSectionElement>('#reminders-tbody');
const aiGeneratorBtn = document.querySelector<HTMLButtonElement>('#gen-btn');

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
