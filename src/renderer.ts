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
const openTodosBtn = document.querySelector<HTMLButtonElement>('#open-todos-btn');

let editingNoteId: number | null = null;
let editingReminderId: number | null = null;
let latestReminders: SavedReminder[] = [];

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

const toOptionalValue = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isReminderPriority = (value: string): value is SavedReminder['priority'] =>
  value === 'low' || value === 'medium' || value === 'high';

const toDateTimeLocalValue = (isoDate: string | null): string => {
  if (!isoDate) {
    return '';
  }

  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  const timezoneOffsetMs = parsedDate.getTimezoneOffset() * 60_000;
  const localDate = new Date(parsedDate.getTime() - timezoneOffsetMs);
  return localDate.toISOString().slice(0, 16);
};

const fromDateTimeLocalValue = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsedDate = new Date(trimmed);
  return Number.isNaN(parsedDate.getTime()) ? trimmed : parsedDate.toISOString();
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
    const isEditing = editingReminderId === reminder.id;
    card.className = isEditing ? 'reminder-card reminder-card--editing' : 'reminder-card';
    card.dataset.reminderId = String(reminder.id);

    const priority = document.createElement('div');
    priority.className = `priority ${reminder.priority === 'high' ? 'high' : reminder.priority === 'low' ? 'low' : ''}`.trim();

    const main = document.createElement('div');
    main.className = 'reminder-main';

    const actions = document.createElement('div');
    actions.className = 'reminder-actions';

    if (isEditing) {
      const editForm = document.createElement('div');
      editForm.className = 'reminder-edit';

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'reminder-edit-input reminder-edit-title';
      titleInput.value = reminder.reminderTitle ?? '';
      titleInput.placeholder = 'Reminder title';

      const textInput = document.createElement('textarea');
      textInput.className = 'reminder-edit-input reminder-edit-text';
      textInput.value = reminder.reminderText ?? '';
      textInput.placeholder = 'Reminder details';

      const dateInput = document.createElement('input');
      dateInput.type = 'datetime-local';
      dateInput.className = 'reminder-edit-input reminder-edit-date';
      dateInput.value = toDateTimeLocalValue(reminder.reminderDate);

      const prioritySelect = document.createElement('select');
      prioritySelect.className = 'reminder-edit-input reminder-edit-priority';
      const priorities: SavedReminder['priority'][] = ['low', 'medium', 'high'];
      for (const priorityOption of priorities) {
        const option = document.createElement('option');
        option.value = priorityOption;
        option.textContent = `${capitalize(priorityOption)} priority`;
        prioritySelect.append(option);
      }
      prioritySelect.value = reminder.priority;

      editForm.append(titleInput, textInput, dateInput, prioritySelect);
      main.append(editForm);

      actions.classList.add('reminder-actions--editing');

      const saveButton = document.createElement('button');
      saveButton.type = 'button';
      saveButton.className = 'reminder-action-btn reminder-text-btn save-reminder-btn';
      saveButton.dataset.reminderId = String(reminder.id);
      saveButton.textContent = 'Save';

      const cancelButton = document.createElement('button');
      cancelButton.type = 'button';
      cancelButton.className = 'reminder-action-btn reminder-text-btn cancel-reminder-btn';
      cancelButton.dataset.reminderId = String(reminder.id);
      cancelButton.textContent = 'Cancel';

      actions.append(saveButton, cancelButton);
    } else {
      const title = document.createElement('h4');
      title.textContent = reminder.reminderTitle ?? reminder.noteContent ?? 'Untitled reminder';

      const summary = document.createElement('p');
      summary.textContent = `${formatReminderDate(reminder.reminderDate)} · ${capitalize(reminder.priority)} priority`;

      const modifyButton = document.createElement('button');
      modifyButton.type = 'button';
      modifyButton.className = 'reminder-action-btn modify-reminder-btn';
      modifyButton.dataset.reminderId = String(reminder.id);
      modifyButton.setAttribute('aria-label', `Modify reminder ${reminder.id}`);

      const modifyImage = document.createElement('img');
      modifyImage.src = modifyIcon;
      modifyImage.alt = '';
      modifyButton.append(modifyImage);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'reminder-action-btn delete-reminder-btn';
      deleteButton.dataset.reminderId = String(reminder.id);
      deleteButton.setAttribute('aria-label', `Delete reminder ${reminder.id}`);

      const deleteImage = document.createElement('img');
      deleteImage.src = trashcanIcon;
      deleteImage.alt = '';
      deleteButton.append(deleteImage);

      main.append(title, summary);
      actions.append(modifyButton, deleteButton);
    }

    card.append(priority, main, actions);
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
    latestReminders = reminders;

    if (
      editingReminderId !== null &&
      !reminders.some((reminder) => reminder.id === editingReminderId)
    ) {
      editingReminderId = null;
    }

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

if (openTodosBtn && status) {
  openTodosBtn.addEventListener('click', () => {
    void (async () => {
      openTodosBtn.disabled = true;
      status.textContent = 'Opening todo list...';

      try {
        await window.thinkbox.showTodosWindow();
        status.textContent = 'Todo list opened.';
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : 'Failed to open todo list.';
      } finally {
        openTodosBtn.disabled = false;
      }
    })();
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

if (remindersList && status) {
  remindersList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const modifyButton = target.closest<HTMLButtonElement>('button.modify-reminder-btn');
    if (modifyButton) {
      const reminderIdText = modifyButton.dataset.reminderId;
      const reminderId = reminderIdText ? Number(reminderIdText) : NaN;
      if (!Number.isInteger(reminderId) || reminderId <= 0) {
        status.textContent = 'Invalid reminder id.';
        return;
      }

      editingReminderId = reminderId;
      renderReminders(latestReminders);
      status.textContent = `Editing reminder #${reminderId}.`;
      return;
    }

    const cancelButton = target.closest<HTMLButtonElement>('button.cancel-reminder-btn');
    if (cancelButton) {
      const reminderIdText = cancelButton.dataset.reminderId;
      const reminderId = reminderIdText ? Number(reminderIdText) : NaN;
      if (!Number.isInteger(reminderId) || reminderId <= 0) {
        status.textContent = 'Invalid reminder id.';
        return;
      }

      editingReminderId = null;
      renderReminders(latestReminders);
      status.textContent = `Edit cancelled for reminder #${reminderId}.`;
      return;
    }

    const saveButton = target.closest<HTMLButtonElement>('button.save-reminder-btn');
    if (saveButton) {
      const reminderIdText = saveButton.dataset.reminderId;
      const reminderId = reminderIdText ? Number(reminderIdText) : NaN;
      if (!Number.isInteger(reminderId) || reminderId <= 0) {
        status.textContent = 'Invalid reminder id.';
        return;
      }

      const card = saveButton.closest<HTMLElement>('.reminder-card');
      if (!card) {
        status.textContent = 'Unable to update reminder.';
        return;
      }

      const titleInput = card.querySelector<HTMLInputElement>('input.reminder-edit-title');
      const textInput = card.querySelector<HTMLTextAreaElement>('textarea.reminder-edit-text');
      const dateInput = card.querySelector<HTMLInputElement>('input.reminder-edit-date');
      const prioritySelect = card.querySelector<HTMLSelectElement>('select.reminder-edit-priority');
      const activeCancelButton = card.querySelector<HTMLButtonElement>('button.cancel-reminder-btn');

      if (!titleInput || !textInput || !dateInput || !prioritySelect) {
        status.textContent = 'Unable to read reminder fields.';
        return;
      }

      const nextPriority = prioritySelect.value.trim().toLowerCase();
      if (!isReminderPriority(nextPriority)) {
        status.textContent = 'Priority must be low, medium, or high.';
        return;
      }

      void (async () => {
        saveButton.disabled = true;
        if (activeCancelButton) {
          activeCancelButton.disabled = true;
        }
        status.textContent = `Updating reminder #${reminderId}...`;

        try {
          const updatedReminder = await window.thinkbox.updateReminder(reminderId, {
            reminderTitle: toOptionalValue(titleInput.value),
            reminderText: toOptionalValue(textInput.value),
            reminderDate: fromDateTimeLocalValue(dateInput.value),
            priority: nextPriority,
          });

          editingReminderId = null;
          status.textContent = `Updated reminder #${updatedReminder.id}.`;
          await loadReminders();
        } catch (error) {
          status.textContent =
            error instanceof Error ? error.message : 'Failed to update reminder.';
          saveButton.disabled = false;
          if (activeCancelButton) {
            activeCancelButton.disabled = false;
          }
        }
      })();
      return;
    }

    const deleteButton = target.closest<HTMLButtonElement>('button.delete-reminder-btn');
    if (!deleteButton) {
      return;
    }

    const reminderIdText = deleteButton.dataset.reminderId;
    const reminderId = reminderIdText ? Number(reminderIdText) : NaN;
    if (!Number.isInteger(reminderId) || reminderId <= 0) {
      status.textContent = 'Invalid reminder id.';
      return;
    }

    void (async () => {
      deleteButton.disabled = true;
      status.textContent = `Deleting reminder #${reminderId}...`;

      try {
        const result = await window.thinkbox.deleteReminder(reminderId);
        if (editingReminderId === reminderId) {
          editingReminderId = null;
        }
        if (!result.deleted) {
          status.textContent = `Reminder #${reminderId} was already removed.`;
        } else {
          status.textContent = `Deleted reminder #${reminderId}.`;
        }

        await loadReminders();
      } catch (error) {
        status.textContent =
          error instanceof Error ? error.message : 'Failed to delete reminder.';
      } finally {
        deleteButton.disabled = false;
      }
    })();
  });
}
