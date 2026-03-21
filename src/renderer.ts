import './index.css';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');

if (note && sendButton && status) {
  const sendNote = async () => {
    const message = note.value.trim();

    if (!message) {
      status.textContent = 'Write something before sending..';
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
