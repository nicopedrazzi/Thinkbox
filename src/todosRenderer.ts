import './todos.css';

const todosList = document.querySelector<HTMLElement>('#todos-list');
const todosStatus = document.querySelector<HTMLParagraphElement>('#todos-status');
const refreshTodosBtn = document.querySelector<HTMLButtonElement>('#refresh-todos-btn');

const formatDate = (isoDate: string): string => {
  const parsedDate = new Date(isoDate);
  return Number.isNaN(parsedDate.getTime()) ? isoDate : parsedDate.toLocaleString();
};

const formatReminderDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'No reminder date';
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

const renderTodos = (todos: SavedTodo[]) => {
  if (!todosList) {
    return;
  }

  todosList.innerHTML = '';

  if (todos.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'todos-empty';
    empty.textContent = 'Nothing pending right now.';
    todosList.append(empty);
    return;
  }

  for (const todo of todos) {
    const card = document.createElement('article');
    card.className = 'todo-card';

    const top = document.createElement('div');
    top.className = 'todo-top';

    const title = document.createElement('h2');
    title.textContent = todo.reminderTitle ?? todo.noteContent ?? 'Untitled todo';

    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'todo-check-btn';
    completeBtn.dataset.todoId = String(todo.id);
    completeBtn.setAttribute('aria-label', `Mark todo ${todo.id} as done`);
    completeBtn.textContent = '✓';

    top.append(title, completeBtn);

    const detail = document.createElement('p');
    detail.className = 'todo-detail';
    detail.textContent = todo.reminderText ?? 'No details';

    const meta = document.createElement('p');
    meta.className = 'todo-meta';
    meta.textContent = `${capitalize(todo.priority)} priority · ${capitalize(todo.category)} · ${formatReminderDate(todo.reminderDate)}`;

    const footer = document.createElement('p');
    footer.className = 'todo-footer';
    footer.textContent = `Created ${formatDate(todo.createdAt)}${todo.noteId ? ` · Note #${todo.noteId}` : ''}`;

    card.append(top, detail, meta, footer);

    todosList.append(card);
  }
};

const loadTodos = async () => {
  if (!todosStatus) {
    return;
  }

  todosStatus.textContent = 'Loading todos...';

  try {
    const todos = await window.thinkbox.showTodos();
    renderTodos(todos);
    todosStatus.textContent = `${todos.length} pending todo${todos.length === 1 ? '' : 's'}.`;
  } catch (error) {
    todosStatus.textContent =
      error instanceof Error ? error.message : 'Failed to load todos.';
  }
};

if (todosList && todosStatus) {
  todosList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const completeBtn = target.closest<HTMLButtonElement>('button.todo-check-btn');
    if (!completeBtn) {
      return;
    }

    const todoIdText = completeBtn.dataset.todoId;
    const todoId = todoIdText ? Number(todoIdText) : NaN;
    if (!Number.isInteger(todoId) || todoId <= 0) {
      todosStatus.textContent = 'Invalid todo id.';
      return;
    }

    const card = completeBtn.closest<HTMLElement>('article.todo-card');
    if (!card) {
      return;
    }

    completeBtn.disabled = true;
    card.classList.add('todo-card--completed');

    try {
      const result = await window.thinkbox.markAsDone(todoId);
      if (!result.completed) {
        card.classList.remove('todo-card--completed');
        todosStatus.textContent = 'Todo was already completed.';
        return;
      }

      await loadTodos();
      todosStatus.textContent = 'Todo completed.';
    } catch (error) {
      card.classList.remove('todo-card--completed');
      todosStatus.textContent =
        error instanceof Error ? error.message : 'Failed to complete todo.';
    } finally {
      completeBtn.disabled = false;
    }
  });
}

if (refreshTodosBtn) {
  refreshTodosBtn.addEventListener('click', () => {
    loadTodos();
  });
}

window.addEventListener('focus', () => {
  loadTodos();
});

loadTodos();
