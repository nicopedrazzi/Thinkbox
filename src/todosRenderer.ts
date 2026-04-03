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

    const title = document.createElement('h2');
    title.textContent = todo.reminderTitle ?? todo.noteContent ?? 'Untitled todo';

    const detail = document.createElement('p');
    detail.className = 'todo-detail';
    detail.textContent = todo.reminderText ?? 'No details';

    const meta = document.createElement('p');
    meta.className = 'todo-meta';
    meta.textContent = `${capitalize(todo.priority)} priority · ${capitalize(todo.category)} · ${formatReminderDate(todo.reminderDate)}`;

    const footer = document.createElement('p');
    footer.className = 'todo-footer';
    footer.textContent = `Created ${formatDate(todo.createdAt)}${todo.noteId ? ` · Note #${todo.noteId}` : ''}`;

    const completeBtn = document.createElement('button');
    completeBtn.type = 'button';
    completeBtn.className = 'todo-complete-btn';
    completeBtn.dataset.todoId = String(todo.id);
    completeBtn.textContent = 'Done';

    card.append(title, detail, meta, footer, completeBtn);

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

if (refreshTodosBtn) {
  refreshTodosBtn.addEventListener('click', () => {
    void loadTodos();
  });
}

if (todosList && todosStatus) {
  todosList.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const completeBtn = target.closest<HTMLButtonElement>('button.todo-complete-btn');
    if (!completeBtn) return;

    const todoId = Number(completeBtn.dataset.todoId);
    if (!Number.isInteger(todoId) || todoId <= 0) {
      todosStatus.textContent = 'Invalid todo id.';
      return;
    }

    const card = completeBtn.closest<HTMLElement>('.todo-card');
    if (!card) return;

    completeBtn.disabled = true;
    card.classList.add('todo-card--completed'); // strike-through now

    try {
      const result = await window.thinkbox.markAsDone(todoId); // backend call

      if (!result.completed) {
        card.classList.remove('todo-card--completed');
        completeBtn.disabled = false;
        todosStatus.textContent = 'Todo already completed.';
        return;
      }

      todosStatus.textContent = 'Todo completed.';
      card.remove(); // or: await loadTodos();
    } catch (error) {
      card.classList.remove('todo-card--completed');
      completeBtn.disabled = false;
      todosStatus.textContent =
        error instanceof Error ? error.message : 'Failed to complete todo.';
    }
  });
}


window.addEventListener('focus', () => {
  void loadTodos();
});

void loadTodos();
