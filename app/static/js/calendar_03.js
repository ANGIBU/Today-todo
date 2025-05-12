// static/js/calendar_03.js
document.addEventListener('DOMContentLoaded', function() {
    // 할 일 추가하기
    async function addTodo(todoData) {
        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todoData)
            });
            
            if (!response.ok) {
                throw new Error('할 일 추가 실패');
            }
            
            const newTodo = await response.json();
            
            // 로컬 배열에 추가
            window.todoApp.todos.push(newTodo);
            
            // 인라인 폼 제거
            const inlineTaskForm = document.querySelector('.inline-task-form-container');
            if (inlineTaskForm) {
                inlineTaskForm.remove();
            }
            
            // 상태 초기화
            window.todoApp.isAddingTask = false;
            window.todoApp.addingTaskCategoryId = null;
            
            // 새 할 일을 UI에 직접 추가
            let container;
            
            if (newTodo.category_id) {
                // 카테고리가 있는 경우
                container = document.querySelector(`#category-${newTodo.category_id}-tasks`);
                
                // 빈 메시지 제거 (있는 경우)
                const emptyMessage = container?.querySelector('.empty-category-tasks');
                if (emptyMessage) {
                    emptyMessage.remove();
                }
            } else {
                // 카테고리가 없는 경우
                container = document.querySelector('#uncategorized-tasks');
                
                // 카테고리 없는 섹션이 없으면 생성
                if (!container) {
                    const uncategorizedContainer = document.createElement('div');
                    uncategorizedContainer.classList.add('category-container');
                    
                    uncategorizedContainer.innerHTML = `
                        <div class="category-header">
                            <div class="category-name">
                                <i class="fas fa-list"></i>
                                기타 할 일
                            </div>
                            <button class="add-task-btn" data-category="">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="category-tasks" id="uncategorized-tasks">
                        </div>
                    `;
                    
                    const tasksList = document.getElementById('tasksList');
                    tasksList.appendChild(uncategorizedContainer);
                    container = document.querySelector('#uncategorized-tasks');
                }
            }
            
            // 할 일 아이템 추가
            if (container) {
                const taskItem = document.createElement('div');
                taskItem.classList.add('task-item');
                taskItem.dataset.id = newTodo.id;
                
                if (newTodo.completed) {
                    taskItem.classList.add('completed');
                }
                
                if (newTodo.pinned) {
                    taskItem.classList.add('pinned');
                }
                
                taskItem.innerHTML = `
                    <div class="task-checkbox">
                        <input type="checkbox" id="task-${newTodo.id}" ${newTodo.completed ? 'checked' : ''}>
                        <label for="task-${newTodo.id}"></label>
                    </div>
                    <div class="task-content">
                        <div class="task-title">${newTodo.title}</div>
                        ${newTodo.description ? `<div class="task-description">${newTodo.description}</div>` : ''}
                    </div>
                    <div class="task-actions">
                        <button class="pin-task" data-id="${newTodo.id}">
                            <i class="fas ${newTodo.pinned ? 'fa-thumbtack active' : 'fa-thumbtack'}"></i>
                        </button>
                        <button class="edit-task" data-id="${newTodo.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-task" data-id="${newTodo.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                container.appendChild(taskItem);
                
                // 체크박스 이벤트 등록
                const checkbox = taskItem.querySelector(`#task-${newTodo.id}`);
                checkbox.addEventListener('change', function() {
                    toggleTodoComplete(newTodo.id, this.checked);
                });
            }
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
        } catch (error) {
            console.error('할 일 추가 중 오류 발생:', error);
            alert('할 일을 추가하는 중 오류가 발생했습니다.');
        }
    }
    
    // 할 일 수정하기
    async function updateTodo(todoId, todoData) {
        try {
            const response = await fetch(`/api/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todoData)
            });
            
            if (!response.ok) {
                throw new Error('할 일 수정 실패');
            }
            
            const updatedTodo = await response.json();
            
            // 로컬 배열 업데이트
            const index = window.todoApp.todos.findIndex(todo => todo.id === parseInt(todoId));
            if (index !== -1) {
                window.todoApp.todos[index] = updatedTodo;
            }
            
            // UI 직접 업데이트
            const oldTaskItem = document.querySelector(`.task-item[data-id="${todoId}"]`);
            const oldCategoryId = oldTaskItem ? oldTaskItem.closest('.category-tasks')?.id.split('-')[1] : null;
            
            // 카테고리가 변경된 경우
            if (oldCategoryId != updatedTodo.category_id) {
                // 기존 아이템 제거
                if (oldTaskItem) {
                    oldTaskItem.remove();
                }
                
                // 새 카테고리에 추가
                let container;
                
                if (updatedTodo.category_id) {
                    container = document.querySelector(`#category-${updatedTodo.category_id}-tasks`);
                } else {
                    container = document.querySelector('#uncategorized-tasks');
                    
                    // 카테고리 없는 섹션이 없으면 생성
                    if (!container) {
                        const uncategorizedContainer = document.createElement('div');
                        uncategorizedContainer.classList.add('category-container');
                        
                        uncategorizedContainer.innerHTML = `
                            <div class="category-header">
                                <div class="category-name">
                                    <i class="fas fa-list"></i>
                                    기타 할 일
                                </div>
                                <button class="add-task-btn" data-category="">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                            <div class="category-tasks" id="uncategorized-tasks">
                            </div>
                        `;
                        
                        const tasksList = document.getElementById('tasksList');
                        tasksList.appendChild(uncategorizedContainer);
                        container = document.querySelector('#uncategorized-tasks');
                    }
                }
                
                // 새 카테고리에 할 일 아이템 추가
                if (container) {
                    const taskItem = document.createElement('div');
                    taskItem.classList.add('task-item');
                    taskItem.dataset.id = updatedTodo.id;
                    
                    if (updatedTodo.completed) {
                        taskItem.classList.add('completed');
                    }
                    
                    if (updatedTodo.pinned) {
                        taskItem.classList.add('pinned');
                    }
                    
                    taskItem.innerHTML = `
                        <div class="task-checkbox">
                            <input type="checkbox" id="task-${updatedTodo.id}" ${updatedTodo.completed ? 'checked' : ''}>
                            <label for="task-${updatedTodo.id}"></label>
                        </div>
                        <div class="task-content">
                            <div class="task-title">${updatedTodo.title}</div>
                            ${updatedTodo.description ? `<div class="task-description">${updatedTodo.description}</div>` : ''}
                        </div>
                        <div class="task-actions">
                            <button class="pin-task" data-id="${updatedTodo.id}">
                                <i class="fas ${updatedTodo.pinned ? 'fa-thumbtack active' : 'fa-thumbtack'}"></i>
                            </button>
                            <button class="edit-task" data-id="${updatedTodo.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-task" data-id="${updatedTodo.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    `;
                    
                    container.appendChild(taskItem);
                    
                    // 체크박스 이벤트 등록
                    const checkbox = taskItem.querySelector(`#task-${updatedTodo.id}`);
                    checkbox.addEventListener('change', function() {
                        toggleTodoComplete(updatedTodo.id, this.checked);
                    });
                }
            } else {
                // 카테고리 변경 없이 내용만 업데이트
                if (oldTaskItem) {
                    // 클래스 업데이트
                    oldTaskItem.classList.toggle('completed', updatedTodo.completed);
                    oldTaskItem.classList.toggle('pinned', updatedTodo.pinned);
                    
                    // 내용 업데이트
                    const titleEl = oldTaskItem.querySelector('.task-title');
                    const descriptionEl = oldTaskItem.querySelector('.task-description');
                    const checkboxEl = oldTaskItem.querySelector(`input[type="checkbox"]`);
                    const pinIconEl = oldTaskItem.querySelector('.fa-thumbtack');
                    
                    if (titleEl) titleEl.textContent = updatedTodo.title;
                    
                    if (updatedTodo.description) {
                        if (descriptionEl) {
                            descriptionEl.textContent = updatedTodo.description;
                        } else {
                            const contentEl = oldTaskItem.querySelector('.task-content');
                            if (contentEl) {
                                contentEl.innerHTML += `<div class="task-description">${updatedTodo.description}</div>`;
                            }
                        }
                    } else if (descriptionEl) {
                        descriptionEl.remove();
                    }
                    
                    if (checkboxEl) checkboxEl.checked = updatedTodo.completed;
                    
                    if (pinIconEl) {
                        if (updatedTodo.pinned) {
                            pinIconEl.classList.add('active');
                        } else {
                            pinIconEl.classList.remove('active');
                        }
                    }
                    
                    // 표시 복원
                    oldTaskItem.style.display = 'flex';
                }
            }
            
            // 인라인 폼 제거
            const inlineTaskForm = document.querySelector('.inline-task-form-container');
            if (inlineTaskForm) {
                inlineTaskForm.remove();
            }
            
            // 상태 초기화
            window.todoApp.isEditingTask = false;
            window.todoApp.editingTaskId = null;
            
            // 달력 업데이트
            window.todoApp.renderCalendar();

            // 전체 할 일 목록 다시 렌더링 - 고정된 항목을 모든 날짜에 표시하기 위해
            window.todoApp.renderTodosAndCategories(window.todoApp.formatSelectedDate());
            
        } catch (error) {
            console.error('할 일 수정 중 오류 발생:', error);
            alert('할 일을 수정하는 중 오류가 발생했습니다.');
        }
    }
    
    // 할 일 핀 상태 토글
    async function toggleTodoPin(todoId) {
        try {
            const response = await fetch(`/api/todos/${todoId}/toggle-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('할 일 핀 상태 변경 실패');
            }
            
            const updatedTodo = await response.json();
            
            // 로컬 배열 업데이트
            const index = window.todoApp.todos.findIndex(todo => todo.id === parseInt(todoId));
            if (index !== -1) {
                window.todoApp.todos[index] = updatedTodo;
            }
            
            // UI 직접 업데이트
            const taskItem = document.querySelector(`.task-item[data-id="${todoId}"]`);
            if (taskItem) {
                // 핀 상태 클래스 토글
                taskItem.classList.toggle('pinned', updatedTodo.pinned);
                
                // 핀 아이콘 업데이트
                const pinIcon = taskItem.querySelector('.fa-thumbtack');
                if (pinIcon) {
                    if (updatedTodo.pinned) {
                        pinIcon.classList.add('active');
                    } else {
                        pinIcon.classList.remove('active');
                    }
                }
            }
            
            // 달력 업데이트
            window.todoApp.renderCalendar();

            // 전체 할 일 목록 다시 불러오기
            await window.todoApp.fetchTodos();
            
            // 할 일 목록 다시 렌더링 - 고정된 항목을 모든 날짜에 표시하기 위해
            window.todoApp.renderTodosAndCategories(window.todoApp.formatSelectedDate());
            
        } catch (error) {
            console.error('할 일 핀 상태 변경 중 오류 발생:', error);
            alert('할 일의 핀 상태를 변경하는 중 오류가 발생했습니다.');
        }
    }
    
    // 할 일 삭제하기
    async function deleteTodo(todoId) {
        try {
            await fetch(`/api/todos/${todoId}`, {
                method: 'DELETE'
            });
            
            // 로컬 배열에서 제거
            window.todoApp.todos = window.todoApp.todos.filter(todo => todo.id !== parseInt(todoId));
            
            // UI에서 직접 제거
            const taskItem = document.querySelector(`.task-item[data-id="${todoId}"]`);
            if (taskItem) {
                taskItem.remove();
                
                // 빈 카테고리 확인
                const categoryTasks = taskItem.closest('.category-tasks');
                if (categoryTasks && !categoryTasks.querySelector('.task-item')) {
                    // 빈 카테고리인 경우 메시지 표시
                    categoryTasks.innerHTML = '<div class="empty-category-tasks">이 카테고리에 할 일이 없습니다</div>';
                }
            }
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
        } catch (error) {
            console.error('할 일 삭제 중 오류 발생:', error);
            alert('할 일을 삭제하는 중 오류가 발생했습니다.');
        }
    }
    
    // 할 일 완료 상태 토글
    async function toggleTodoComplete(todoId, completed) {
        try {
            const response = await fetch(`/api/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed })
            });
            
            if (!response.ok) {
                throw new Error('할 일 상태 변경 실패');
            }
            
            const updatedTodo = await response.json();
            
            // 로컬 배열 업데이트
            const index = window.todoApp.todos.findIndex(todo => todo.id === parseInt(todoId));
            if (index !== -1) {
                window.todoApp.todos[index] = updatedTodo;
            }
            
            // UI 직접 업데이트
            const taskItem = document.querySelector(`.task-item[data-id="${todoId}"]`);
            if (taskItem) {
                if (completed) {
                    taskItem.classList.add('completed');
                } else {
                    taskItem.classList.remove('completed');
                }
            }
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
        } catch (error) {
            console.error('할 일 상태 변경 중 오류 발생:', error);
            alert('할 일 상태를 변경하는 중 오류가 발생했습니다.');
        }
    }
    
    // 할 일 항목 렌더링 (번호 없음)
    function renderTodoItem(todo, container) {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        taskItem.dataset.id = todo.id;
        
        // 완료 상태에 따른 클래스 추가
        if (todo.completed) {
            taskItem.classList.add('completed');
        }
        
        // 핀 상태에 따른 클래스 추가
        if (todo.pinned) {
            taskItem.classList.add('pinned');
        }
        
        taskItem.innerHTML = `
            <div class="task-checkbox">
                <input type="checkbox" id="task-${todo.id}" ${todo.completed ? 'checked' : ''}>
                <label for="task-${todo.id}"></label>
            </div>
            <div class="task-content">
                <div class="task-title">${todo.title}</div>
                ${todo.description ? `<div class="task-description">${todo.description}</div>` : ''}
            </div>
            <div class="task-actions">
                <button class="pin-task" data-id="${todo.id}">
                    <i class="fas ${todo.pinned ? 'fa-thumbtack active' : 'fa-thumbtack'}"></i>
                </button>
                <button class="edit-task" data-id="${todo.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-task" data-id="${todo.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.appendChild(taskItem);
        
        // 체크박스 이벤트 등록
        const checkbox = taskItem.querySelector(`#task-${todo.id}`);
        checkbox.addEventListener('change', function() {
            toggleTodoComplete(todo.id, this.checked);
        });

        // 핀 버튼 이벤트 등록 - 직접 이벤트 추가
        const pinBtn = taskItem.querySelector('.pin-task');
        if (pinBtn) {
            pinBtn.addEventListener('click', function() {
                toggleTodoPin(todo.id);
            });
        }
    }
    
    // 날짜별 할 일 및 카테고리 렌더링 - 수정됨
    function renderTodosAndCategories(dateStr) {
        console.log('할일 목록 렌더링 시작:', dateStr);
        console.log('현재 카테고리:', window.todoApp.categories);
        console.log('현재 할일 목록:', window.todoApp.todos);
        
        // 인라인 폼 상태 저장
        const wasAddingCategory = window.todoApp.isAddingCategory;
        const wasEditingCategory = window.todoApp.isEditingCategory;
        const oldEditingCategoryId = window.todoApp.editingCategoryId;
        const wasAddingTask = window.todoApp.isAddingTask;
        const oldAddingTaskCategoryId = window.todoApp.addingTaskCategoryId;
        const wasEditingTask = window.todoApp.isEditingTask;
        const oldEditingTaskId = window.todoApp.editingTaskId;
        
        // 할 일 목록 초기화
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        
        // 해당 날짜의 할 일 필터링 (핀 된 항목 포함)
        const dayTodos = window.todoApp.todos.filter(todo => {
            const todoDate = formatDate(new Date(todo.date));
            const matchesDate = todoDate === dateStr;
            const isPinned = todo.pinned === true || todo.pinned === 1; // 숫자 1도 포함
            
            console.log(`할일 ID ${todo.id} 날짜 비교:`, todoDate, dateStr, matchesDate);
            console.log(`할일 ID ${todo.id} 핀 상태:`, todo.pinned, isPinned);
            
            return matchesDate || isPinned;
        });
        
        console.log('날짜에 해당하는 할일:', dayTodos);
        
        if (dayTodos.length === 0 && window.todoApp.categories.length === 0 && !wasAddingCategory) {
            // 할 일과 카테고리가 모두 없을 경우
            tasksList.innerHTML = '<div class="empty-list">이 날짜에 등록된 할 일이 없습니다<br>아래 "카테고리 추가" 버튼을 눌러 새 카테고리를 만들어보세요.</div>';
            return;
        }
    
        // 카테고리별로 할 일 그룹화
        const todosByCategory = {};
        const todosWithoutCategory = [];
        
        // 모든 카테고리를 먼저 추가
        window.todoApp.categories.forEach(category => {
            todosByCategory[category.id] = [];
        });
        
        // 할 일을 카테고리별로 분류
        dayTodos.forEach(todo => {
            if (todo.category_id) {
                if (!todosByCategory[todo.category_id]) {
                    todosByCategory[todo.category_id] = [];
                }
                todosByCategory[todo.category_id].push(todo);
            } else {
                todosWithoutCategory.push(todo);
            }
        });
        
        console.log('카테고리별 할일:', todosByCategory);
        console.log('카테고리 없는 할일:', todosWithoutCategory);
        
        // 카테고리별 할 일 렌더링
        for (const categoryId in todosByCategory) {
            const category = window.todoApp.categories.find(cat => cat.id === parseInt(categoryId));
            if (!category) {
                console.warn('해당 카테고리를 찾을 수 없음:', categoryId);
                continue;
            }
            
            const categoryContainer = document.createElement('div');
            categoryContainer.classList.add('category-container');
            categoryContainer.dataset.id = category.id;
            
            // 수정 중인 카테고리는 숨김 처리
            if (wasEditingCategory && oldEditingCategoryId === category.id) {
                categoryContainer.style.display = 'none';
            }
            
            // 카테고리 표시 - 색상 적용
            categoryContainer.innerHTML = `
                <div class="category-header" style="background-color: #f8f8f8;">
                    <div class="category-name" style="color: ${category.color}">
                        <i class="fas fa-tag"></i>
                        ${category.name}
                    </div>
                    <div class="category-actions">
                        <button class="edit-category-btn" data-category="${category.id}">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="add-task-btn" data-category="${category.id}">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="delete-category-btn" data-category="${category.id}">
                            <i class="fas fa-minus"></i>
                        </button>
                    </div>
                </div>
                <div class="category-tasks" id="category-${category.id}-tasks">
                </div>
            `;
            
            tasksList.appendChild(categoryContainer);
            
            const categoryTasksContainer = categoryContainer.querySelector(`#category-${category.id}-tasks`);
            
            // 카테고리 내 할 일 렌더링
            const todos = todosByCategory[categoryId];
            if (todos.length > 0) {
                // 할 일 목록 렌더링
                todos.forEach(todo => {
                    renderTodoItem(todo, categoryTasksContainer);
                });
            } else {
                // 빈 카테고리인 경우 메시지 표시
                categoryTasksContainer.innerHTML = '<div class="empty-category-tasks">이 카테고리에 할 일이 없습니다</div>';
            }
        }
        
        // 카테고리 없는 할 일 렌더링
        if (todosWithoutCategory.length > 0) {
            const uncategorizedContainer = document.createElement('div');
            uncategorizedContainer.classList.add('category-container');
            
            uncategorizedContainer.innerHTML = `
                <div class="category-header">
                    <div class="category-name">
                        <i class="fas fa-list"></i>
                        기타 할 일
                    </div>
                    <button class="add-task-btn" data-category="">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="category-tasks" id="uncategorized-tasks">
                </div>
            `;
            
            tasksList.appendChild(uncategorizedContainer);
            
            const uncategorizedTasksContainer = uncategorizedContainer.querySelector('#uncategorized-tasks');
            
            // 카테고리 없는 할 일 렌더링
            todosWithoutCategory.forEach(todo => {
                renderTodoItem(todo, uncategorizedTasksContainer);
            });
        }
        
        // 인라인 폼 다시 렌더링 (필요한 경우)
        if (wasAddingCategory) {
            window.todoApp.isAddingCategory = true;
            window.todoApp.renderInlineCategoryForm();
        } else if (wasEditingCategory && oldEditingCategoryId) {
            const category = window.todoApp.categories.find(cat => cat.id === oldEditingCategoryId);
            if (category) {
                window.todoApp.isEditingCategory = true;
                window.todoApp.editingCategoryId = oldEditingCategoryId;
                window.todoApp.renderInlineCategoryForm(category);
            }
        } else if (wasAddingTask) {
            window.todoApp.isAddingTask = true;
            window.todoApp.addingTaskCategoryId = oldAddingTaskCategoryId;
            window.todoApp.renderInlineTaskForm(oldAddingTaskCategoryId);
        } else if (wasEditingTask && oldEditingTaskId) {
            const todo = window.todoApp.todos.find(t => t.id === oldEditingTaskId);
            if (todo) {
                window.todoApp.isEditingTask = true;
                window.todoApp.editingTaskId = oldEditingTaskId;
                window.todoApp.renderInlineTaskForm(todo.category_id, todo);
            }
        }
        
        console.log('할일 목록 렌더링 완료');
    }
    
    // 날짜를 YYYY-MM-DD 형식으로 변환
    function formatDate(date) {
        if (!date) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // toggleTodo 이벤트 리스너 등록
    document.addEventListener('toggleTodo', function(e) {
        toggleTodoComplete(e.detail.todoId, e.detail.completed);
    });

    // 날짜 변경 이벤트 리스너 추가 - 달력 날짜 클릭 시 할 일 목록 새로고침
    document.addEventListener('dateChanged', function(e) {
        const dateStr = e.detail.date;
        
        // 일기장 데이터 로드 (diary.js에서 처리)
        
        // 할 일 목록 다시 렌더링
        window.todoApp.renderTodosAndCategories(dateStr);
    });
    
    // 전역 스코프에 함수 노출 (calendar_02.js에서 사용할 수 있도록)
    window.addTodo = addTodo;
    window.updateTodo = updateTodo;
    window.toggleTodoPin = toggleTodoPin;
    window.deleteTodo = deleteTodo;
    window.toggleTodoComplete = toggleTodoComplete;
    
    // window.todoApp에 함수 추가
    window.todoApp.addTodo = addTodo;
    window.todoApp.updateTodo = updateTodo;
    window.todoApp.toggleTodoPin = toggleTodoPin;
    window.todoApp.deleteTodo = deleteTodo;
    window.todoApp.toggleTodoComplete = toggleTodoComplete;
    window.todoApp.renderTodosAndCategories = renderTodosAndCategories;

    // 페이지 로드 시 할 일 목록 및 카테고리 다시 로드
    setTimeout(async function() {
        try {
            await window.todoApp.fetchTodos();
            await window.todoApp.fetchCategories();
            
            // 선택된 날짜의 할 일 목록 렌더링
            const dateStr = window.todoApp.formatSelectedDate();
            window.todoApp.renderTodosAndCategories(dateStr);
        } catch (error) {
            console.error('데이터 로드 중 오류 발생:', error);
        }
    }, 500);
});