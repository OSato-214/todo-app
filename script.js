// HTML要素
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskDueDate = document.getElementById('task-due-date');
const taskPriority = document.getElementById('task-priority');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');

// アプリの状態
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
// ★★★ デフォルトのフィルターを「作業中」に変更 ★★★
let currentFilter = 'active';

// localStorageに保存
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// 画面にタスクを描画
function renderTasks() {
    taskList.innerHTML = '';

    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });
    
    // ★★★ 期限の昇順（早い順）で並び替え ★★★
    filteredTasks.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        // aとbを入れ替えて昇順にする
        return new Date(a.dueDate) - new Date(b.dueDate); 
    });

    filteredTasks.forEach(task => {
        const index = tasks.findIndex(t => t.id === task.id);
        const listItem = document.createElement('li');
        
        if (task.completed) {
            listItem.classList.add('task-completed');
        }

        const priorityIndicator = document.createElement('div');
        priorityIndicator.className = `priority-indicator priority-${task.priority}`;
        const priorityText = { high: '高', medium: '中', low: '低' };
        priorityIndicator.textContent = priorityText[task.priority];
        listItem.appendChild(priorityIndicator);

        if (task.editing) {
            // (編集モードのロジックは変更なし)
            const editForm = document.createElement('div');
            editForm.className = 'task-content';

            const editInput = document.createElement('input');
            editInput.type = 'text';
            editInput.value = task.text;
            editInput.className = 'edit-input';

            const editDueDate = document.createElement('input');
            editDueDate.type = 'datetime-local';
            editDueDate.value = task.dueDate;

            const editPriority = document.createElement('select');
            ['low', 'medium', 'high'].forEach(p => {
                const option = document.createElement('option');
                option.value = p;
                option.textContent = priorityText[p];
                if (p === task.priority) option.selected = true;
                editPriority.appendChild(option);
            });
            
            const saveButton = document.createElement('button');
            saveButton.textContent = '保存';
            saveButton.className = 'edit-btn';
            saveButton.addEventListener('click', () => {
                tasks[index].text = editInput.value.trim() || tasks[index].text;
                tasks[index].dueDate = editDueDate.value;
                tasks[index].priority = editPriority.value;
                tasks[index].editing = false;
                saveTasks();
                renderTasks();
            });

            editForm.appendChild(editInput);
            editForm.appendChild(editDueDate);
            editForm.appendChild(editPriority);
            listItem.appendChild(editForm);
            listItem.appendChild(saveButton);

        } else {
            // (通常表示のロジックは変更なし)
            const taskContent = document.createElement('div');
            taskContent.className = 'task-content';

            const taskSpan = document.createElement('span');
            taskSpan.textContent = task.text;
            taskContent.appendChild(taskSpan);

            if (task.dueDate) {
                const dueDateSpan = document.createElement('span');
                dueDateSpan.className = 'due-date';
                const formattedDate = task.dueDate.replace('T', ' ').substring(0, 16);
                dueDateSpan.textContent = `期限: ${formattedDate}`;
                taskContent.appendChild(dueDateSpan);
            }
            
            taskContent.addEventListener('click', () => {
                tasks[index].completed = !tasks[index].completed;
                saveTasks();
                renderTasks();
            });
            
            listItem.appendChild(taskContent);

            const buttonsDiv = document.createElement('div');
            const editButton = document.createElement('button');
            editButton.textContent = '編集';
            editButton.className = 'edit-btn';
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                tasks.forEach(t => t.editing = false);
                tasks[index].editing = true;
                renderTasks();
            });
            buttonsDiv.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                tasks.splice(index, 1);
                saveTasks();
                renderTasks();
            });
            buttonsDiv.appendChild(deleteButton);
            listItem.appendChild(buttonsDiv);
        }
        taskList.appendChild(listItem);
    });

    filterButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.filter === currentFilter);
    });
}

// イベントリスナー
taskForm.addEventListener('submit', event => {
    event.preventDefault();
    const taskText = taskInput.value.trim();
    let dueDate = taskDueDate.value;
    const priority = taskPriority.value;

    if (!dueDate) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        dueDate = now.toISOString().slice(0, 16);
    }

    if (taskText !== '') {
        tasks.push({ 
            id: Date.now(),
            text: taskText, 
            dueDate: dueDate, 
            priority: priority,
            completed: false, 
            editing: false 
        });
        taskInput.value = '';
        taskDueDate.value = '';
        taskPriority.value = 'medium';
        saveTasks();
        renderTasks();
    }
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        renderTasks();
    });
});

// 初期表示
renderTasks();