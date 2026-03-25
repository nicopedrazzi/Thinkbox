import './index.css';
import trashcanIcon from './assets/trashcan.svg';
import modifyIcon from './assets/modify.svg';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');
const notesList = document.querySelector<HTMLElement>('#notes-list');
const remindersList = document.querySelector<HTMLElement>('#reminders-list');
const notesCount = document.querySelector<HTMLElement>('#notes-count');
const aiGeneratorBtn = document.querySelector<HTMLButtonElement>('#gen-btn');

let editingNoteId: number | null = null;

const resetComposerToCreateMode = () => {
  editingNoteId = null;

  if (sendButton) {
    sendButton.textContent = 'Save note';
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
    return 'No date';
  }

  const parsedDate = new Date(isoDate);
  return Number.isNaN(parsedDate.getTime()) ? isoDate : parsedDate.toLocaleString();
};

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }

  return value[0].toUpperCase() + value.slice(1);
};

const renderNotes = (savedNotes: SavedNote[]) => {
  if (!notesList) {
    return;
  }

  notesList.innerHTML = '';

  if (notesCount) {
    notesCount.textContent = `${savedNotes.length} captured`;
  }

  if (savedNotes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No notes yet. Write your first note above.';
    notesList.append(empty);
    return;
  }

  for (const [index, savedNote] of savedNotes.entries()) {
    const card = document.createElement('article');
    card.className = `note-card gradient-${(index % 3) + 1}`;

    const top = document.createElement('div');
    top.className = 'note-top';

    const text = document.createElement('p');
    text.className = 'note-text';
    text.textContent = savedNote.content;

    const actions = document.createElement('div');
    actions.className = 'note-actions';

    const modifyButton = document.createElement('button');
    modifyButton.type = 'button';
    modifyButton.className = 'note-action-btn modify-note-btn';
    modifyButton.dataset.noteId = String(savedNote.id);
    modifyButton.dataset.noteContent = savedNote.content;
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

    actions.append(modifyButton, deleteButton);
    top.append(text, actions);

    const meta = document.createElement('div');
    meta.className = 'note-meta';

    const idPill = document.createElement('span');
    idPill.className = 'pill';
    idPill.textContent = `Note #${savedNote.id}`;

    const createdAt = document.createElement('span');
    createdAt.textContent = formatDate(savedNote.createdAt);

    meta.append(idPill, createdAt);
    card.append(top, meta);
    notesList.append(card);
  }
};

const renderReminders = (savedReminders: SavedReminder[]) => {
  if (!remindersList) {
    return;
  }

  remindersList.innerHTML = '';

  if (savedReminders.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No reminders generated yet.';
    remindersList.append(empty);
    return;
  }

  for (const reminder of savedReminders) {
    const card = document.createElement('article');
    card.className = 'reminder-card';

    const priority = document.createElement('div');
    priority.className = `priority ${reminder.priority === 'high' ? 'high' : reminder.priority === 'low' ? 'low' : ''}`.trim();

    const main = document.createElement('div');
    main.className = 'reminder-main';

    const title = document.createElement('h4');
    title.textContent = reminder.reminderTitle ?? reminder.noteContent ?? 'Untitled reminder';

    const summary = document.createElement('p');
    summary.textContent = `${formatReminderDate(reminder.reminderDate)} · ${capitalize(reminder.priority)} priority`;

    main.append(title, summary);
    card.append(priority, main);
    remindersList.append(card);
  }
};

const loadNotes = async () => {
  if (!status) {
    return;
  }

  try {
    const savedNotes = await window.thinkbox.showNote();
    renderNotes(savedNotes);
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
        status.textContent = `Updated note #${updatedNote.id}.`;
      }

      note.value = '';
      note.focus();
      resetComposerToCreateMode();
      await loadNotes();
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

if (aiGeneratorBtn && status) {
  const generateReminders = async () => {
    aiGeneratorBtn.disabled = true;
    status.textContent = 'Creating reminders...';

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

if (notesList && status) {
  notesList.addEventListener('click', (event) => {
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

      const currentContent = modifyButton.dataset.noteContent ?? '';
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
