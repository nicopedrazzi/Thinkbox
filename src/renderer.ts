import './index.css';

const note = document.querySelector<HTMLTextAreaElement>('#note');
const sendButton = document.querySelector<HTMLButtonElement>('#send-btn');
const status = document.querySelector<HTMLParagraphElement>('#status');

if (note && sendButton && status) {
  const sendNote = () => {
    const message = note.value.trim();

    if (!message) {
      status.textContent = 'Please write something before sending.';
      return;
    }

    status.textContent = `Sent: ${message}`;
    note.value = '';
    note.focus();
  };

  sendButton.addEventListener('click', sendNote);

  note.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendNote();
    }
  });
}
