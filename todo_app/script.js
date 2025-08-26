// --- HTML要素の取得 ---
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskDueDate = document.getElementById('task-due-date');
const taskPriority = document.getElementById('task-priority');
const taskList = document.getElementById('task-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const showListViewBtn = document.getElementById('show-list-view');
const showCalendarViewBtn = document.getElementById('show-calendar-view');
const listView = document.getElementById('list-view');
const calendarView = document.getElementById('calendar-view');
const calendarEl = document.getElementById('calendar');
const dayViewPanel = document.getElementById('day-view-panel');
const dayViewTitle = document.getElementById('day-view-title');
const dayViewCloseBtn = document.getElementById('day-view-close-btn');
const dayViewList = document.getElementById('day-view-list');

// --- アプリの状態 ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'active';
let calendar = null;
let activeDayViewDate = null; // サイドパネルで表示中の日付を記憶する変数

// --- ヘルパー変数 ---
const priorityText = { high: '高', medium: '中', low: '低' };
const priorityColors = { high: '#dc3545', medium: '#ffc107', low: '#0d6efd' };

// --- 関数定義 ---
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderListView() {
    taskList.innerHTML = '';
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    filteredTasks.sort((a, b) => (new Date(a.dueDate) - new Date(b.dueDate)) || (priorityOrder[a.priority] - priorityOrder[b.priority]));

    filteredTasks.forEach(task => {
        const index = tasks.findIndex(t => t.id === task.id);
        const listItem = document.createElement('li');
        if (task.completed) listItem.classList.add('task-completed');

        const priorityIndicator = document.createElement('div');
        priorityIndicator.className = `priority-indicator priority-${task.priority}`;
        priorityIndicator.textContent = priorityText[task.priority];
        listItem.appendChild(priorityIndicator);

        if (task.editing) {
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
                render();
            });
            editForm.appendChild(editInput);
            editForm.appendChild(editDueDate);
            editForm.appendChild(editPriority);
            listItem.appendChild(editForm);
            listItem.appendChild(saveButton);
        } else {
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
                render();
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
                render();
            });
            buttonsDiv.appendChild(editButton);
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                tasks.splice(index, 1);
                saveTasks();
                render();
            });
            buttonsDiv.appendChild(deleteButton);
            listItem.appendChild(buttonsDiv);
        }
        taskList.appendChild(listItem);
    });
}

function renderCalendarView() {
    const filteredTasks = tasks.filter(task => {
        if (currentFilter === 'active') return !task.completed;
        if (currentFilter === 'completed') return task.completed;
        return true;
    });
    
    const events = filteredTasks
        .filter(task => task.dueDate)
        .map(task => ({
            id: task.id,
            title: `[${priorityText[task.priority]}] ${task.text}`,
            start: task.dueDate,
            backgroundColor: task.completed ? '#adb5bd' : priorityColors[task.priority],
            borderColor: task.completed ? '#adb5bd' : priorityColors[task.priority],
        }));
    
    let currentView = 'dayGridMonth';
    if(calendar) {
        currentView = calendar.view.type;
        calendar.destroy();
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: currentView,
        locale: 'ja',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
        },
        height: 'auto',
        allDaySlot: false,
        eventDisplay: 'list-item',
        events: events,
        eventClick: function(info) {
            const clickedTaskId = parseInt(info.event.id);
            const taskIndex = tasks.findIndex(t => t.id === clickedTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].completed = !tasks[taskIndex].completed;
                saveTasks();
                render();
            }
        },
        dateClick: function(info) {
            openDayView(info.date);
        },
        dayCellDidMount: function(info) {
            if (info.date.getDay() === 0) {
                info.el.classList.add('fc-day-sun');
            } else if (info.date.getDay() === 6) {
                info.el.classList.add('fc-day-sat');
            }
        }
    });
    calendar.render();
}

function openDayView(date) {
    activeDayViewDate = date;
    document.body.classList.add('day-view-open');

    dayViewTitle.textContent = `${date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}`;
    dayViewList.innerHTML = '';
    
    const dayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        return taskDate.getFullYear() === date.getFullYear() &&
               taskDate.getMonth() === date.getMonth() &&
               taskDate.getDate() === date.getDate();
    });
    
    dayTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    if (dayTasks.length > 0) {
        dayTasks.forEach(task => {
            const item = document.createElement('li');
            item.className = 'day-view-item';
            const time = new Date(task.dueDate).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div class="priority-indicator priority-${task.priority}">
                    ${priorityText[task.priority]}
                </div>
                <div>
                    <div>${time}</div>
                    <div>${task.text}</div>
                </div>
            `;
            if (task.completed) {
                item.style.textDecoration = 'line-through';
                item.style.opacity = '0.6';
            }

            item.addEventListener('click', () => {
                const originalTask = tasks.find(t => t.id === task.id);
                if (originalTask) {
                    originalTask.completed = !originalTask.completed;
                    saveTasks();
                    render();
                }
            });

            dayViewList.appendChild(item);
        });
    } else {
        dayViewList.innerHTML = '<li>この日のタスクはありません。</li>';
    }
    
    dayViewPanel.classList.add('visible');
}

function closeDayView() {
    activeDayViewDate = null;
    document.body.classList.remove('day-view-open');
    dayViewPanel.classList.remove('visible');
}

function render() {
    renderListView();
    if (!calendarView.classList.contains('hidden')) {
        renderCalendarView();
    }
    if (activeDayViewDate) {
        openDayView(activeDayViewDate);
    }
    filterButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.filter === currentFilter);
    });
}

// --- イベントリスナー ---
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
            id: Date.now(), text: taskText, dueDate: dueDate, 
            priority: priority, completed: false, editing: false 
        });
        taskInput.value = '';
        taskDueDate.value = '';
        taskPriority.value = 'medium';
        saveTasks();
        render();
    }
});

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentFilter = button.dataset.filter;
        render();
    });
});

showListViewBtn.addEventListener('click', () => {
    listView.classList.remove('hidden');
    calendarView.classList.add('hidden');
    showListViewBtn.classList.add('active');
    showCalendarViewBtn.classList.remove('active');
    closeDayView(); // ビューを切り替えたらサイドパネルは閉じる
});

showCalendarViewBtn.addEventListener('click', () => {
    listView.classList.add('hidden');
    calendarView.classList.remove('hidden');
    showListViewBtn.classList.remove('active');
    showCalendarViewBtn.classList.add('active');
    renderCalendarView();
});

dayViewCloseBtn.addEventListener('click', closeDayView);

// --- 初期化 ---
render();