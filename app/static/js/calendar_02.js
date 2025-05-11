// static/js/calendar_02.js
document.addEventListener('DOMContentLoaded', function() {
    // todoApp 객체 참조
    const tasksList = document.getElementById('tasksList');
    
    // 인라인 카테고리 폼 렌더링
    function renderInlineCategoryForm(category = null) {
        // 이미 폼이 열려있는지 확인
        if (document.querySelector('.inline-form-container')) {
            return; // 이미 폼이 열려있으면 추가로 생성하지 않음
        }
        
        let colorOptions = '';
        // 추가된 색상 (더 다양한 색상 포함, 짙은 계열 위주)
        const colors = [
            '#8B0000', // 진한 빨강
            '#006400', // 진한 초록
            '#00008B', // 진한 파랑
            '#4B0082', // 인디고
            '#800080', // 자주색
            '#B22222', // 벽돌색
            '#A0522D', // 갈색
            '#8B4513', // 새들 브라운
            '#2F4F4F', // 진한 슬레이트 그레이
            '#556B2F', // 올리브 드랩
            '#191970', // 미드나잇 블루
            '#708090', // 슬레이트 그레이
            '#BDB76B', // 다크 카키
            '#808000', // 올리브
            '#6B8E23', // 올리브 드랩
            '#654321', // 다크 브라운
            '#5F9EA0', // 카델블루
            '#BC8F8F', // 로지 브라운
            '#A52A2A', // 갈색
            '#B8860B', // 다크 골든로드
            '#CD5C5C', // 인디언 레드
            '#8A2BE2', // 블루바이올렛
            '#9932CC', // 다크 오키드
            '#C71585', // 중간 자주색
            '#FF4500', // 오렌지레드
            '#FF8C00'  // 짙은 주황
        ];
        
        colors.forEach((color, index) => {
            const checked = category && category.color === color ? 'checked' : (index === 0 && !category ? 'checked' : '');
            colorOptions += `
                <div class="color-option">
                    <input type="radio" name="categoryColor" id="inlineColor${index}" value="${color}" ${checked}>
                    <label for="inlineColor${index}" style="background-color: ${color};"></label>
                </div>
            `;
        });
        
        const formContainer = document.createElement('div');
        formContainer.classList.add('inline-form-container');
        formContainer.innerHTML = `
            <form id="inlineCategoryForm" class="inline-category-form">
                <div class="inline-form-header">
                    <input type="text" class="category-name-field" name="categoryName" placeholder="카테고리 이름을 입력하세요" value="${category ? category.name : ''}" required>
                </div>
                <div class="inline-form-body">
                    <div class="form-group">
                        <div class="color-options">
                            ${colorOptions}
                        </div>
                    </div>
                    <div class="inline-form-actions">
                        <button type="submit" class="btn-save">저장</button>
                        <button type="button" class="btn-cancel">취소</button>
                    </div>
                </div>
                ${category ? `<input type="hidden" name="categoryId" value="${category.id}">` : ''}
            </form>
        `;
        
        // 취소 버튼 이벤트
        formContainer.querySelector('.btn-cancel').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelInlineForm();
        });
        
        // 인라인 폼 추가 - 카테고리 추가 버튼 바로 위에 삽입
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (category) {
            // 수정 모드: 기존 카테고리 컨테이너 다음에 삽입
            const categoryContainer = document.querySelector(`.category-container[data-id="${category.id}"]`);
            if (categoryContainer) {
                categoryContainer.style.display = 'none'; // 기존 카테고리 숨기기
                categoryContainer.insertAdjacentElement('afterend', formContainer);
            }
        } else {
            // 추가 모드: 카테고리 추가 버튼 바로 위에 삽입
            addCategoryBtn.parentNode.insertBefore(formContainer, addCategoryBtn);
        }
        
        // 카테고리 이름 입력 필드에 자동 포커스
        setTimeout(() => {
            formContainer.querySelector('input[name="categoryName"]').focus();
        }, 100);
    }
    
    // 인라인 할 일 추가/수정 폼 렌더링
    function renderInlineTaskForm(categoryId, todo = null) {
        const selectedDay = document.querySelector('.day.selected');
        if (!selectedDay && !todo) {
            alert('먼저 날짜를 선택해주세요.');
            return;
        }
        
        const date = todo ? todo.date : window.todoApp.formatSelectedDate();
        
        const formContainer = document.createElement('div');
        formContainer.classList.add('inline-task-form-container');
        formContainer.innerHTML = `
            <form id="inlineTaskForm" class="inline-task-form">
                <div class="task-form-content">
                    <input type="text" name="taskTitle" placeholder="할 일 제목" value="${todo ? todo.title : ''}" required>
                    <textarea name="taskDescription" placeholder="설명 (선택사항)" rows="2">${todo ? todo.description || '' : ''}</textarea>
                </div>
                <div class="task-form-actions">
                    <button type="submit" class="btn-save">저장</button>
                    <button type="button" class="btn-cancel">취소</button>
                </div>
                <input type="hidden" name="taskDate" value="${date}">
                <input type="hidden" name="categoryId" value="${categoryId || ''}">
                <input type="hidden" name="pinned" value="${todo && todo.pinned ? 'true' : 'false'}">
                ${todo ? `<input type="hidden" name="taskId" value="${todo.id}">` : ''}
            </form>
        `;
        
        // 취소 버튼 이벤트
        formContainer.querySelector('.btn-cancel').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            cancelInlineTaskForm();
        });
        
        // 텍스트 영역 키 이벤트 처리
        const taskTitle = formContainer.querySelector('input[name="taskTitle"]');
        const taskDescription = formContainer.querySelector('textarea[name="taskDescription"]');
        
        // 타이틀 입력 필드에 키 이벤트 추가
        taskTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // 폼 제출
                formContainer.querySelector('form').dispatchEvent(new Event('submit'));
            }
        });
        
        // 설명 텍스트 영역에 키 이벤트 추가
        taskDescription.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // 쉬프트+엔터는 줄바꿈 허용 (기본 동작)
                    return;
                } else {
                    e.preventDefault();
                    // 폼 제출
                    formContainer.querySelector('form').dispatchEvent(new Event('submit'));
                }
            }
        });
        
        if (todo) {
            // 수정 모드: 기존 할 일 아이템 다음에 삽입
            const taskItem = document.querySelector(`.task-item[data-id="${todo.id}"]`);
            if (taskItem) {
                taskItem.style.display = 'none'; // 기존 할 일 숨기기
                taskItem.insertAdjacentElement('afterend', formContainer);
            }
        } else {
            // 추가 모드: 카테고리 내에 또는 '기타 할 일' 섹션에 추가
            if (categoryId) {
                // 카테고리 내에 추가
                const categoryTasks = document.querySelector(`#category-${categoryId}-tasks`);
                if (categoryTasks) {
                    // 빈 메시지가 있으면 제거
                    const emptyMessage = categoryTasks.querySelector('.empty-category-tasks');
                    if (emptyMessage) {
                        categoryTasks.innerHTML = '';
                    }
                    categoryTasks.appendChild(formContainer);
                }
            } else {
                // 카테고리 없는 할 일 섹션에 추가
                const uncategorizedTasks = document.querySelector('#uncategorized-tasks');
                if (uncategorizedTasks) {
                    uncategorizedTasks.appendChild(formContainer);
                } else {
                    // 카테고리 없는 섹션이 없으면 생성
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
                    document.querySelector('#uncategorized-tasks').appendChild(formContainer);
                }
            }
        }
        
        // 입력 필드에 포커스
        setTimeout(() => {
            taskTitle.focus();
        }, 100);
    }
    
    // 인라인 폼 취소
    function cancelInlineForm() {
        const inlineForm = document.querySelector('.inline-form-container');
        if (inlineForm) {
            inlineForm.remove();
        }
        
        // 수정 중이었던 카테고리 다시 표시
        if (window.todoApp.isEditingCategory && window.todoApp.editingCategoryId) {
            const categoryContainer = document.querySelector(`.category-container[data-id="${window.todoApp.editingCategoryId}"]`);
            if (categoryContainer) {
                categoryContainer.style.display = 'block';
            }
        }
        
        // 상태 초기화
        window.todoApp.isAddingCategory = false;
        window.todoApp.isEditingCategory = false;
        window.todoApp.editingCategoryId = null;
    }
    
    // 인라인 할 일 폼 취소
    function cancelInlineTaskForm() {
        // 수정 중이었던 할 일 다시 표시
        if (window.todoApp.isEditingTask && window.todoApp.editingTaskId) {
            const taskItem = document.querySelector(`.task-item[data-id="${window.todoApp.editingTaskId}"]`);
            if (taskItem) {
                taskItem.style.display = 'flex';
            }
        }
        
        const inlineTaskForm = document.querySelector('.inline-task-form-container');
        if (inlineTaskForm) {
            inlineTaskForm.remove();
        }
        
        window.todoApp.isAddingTask = false;
        window.todoApp.isEditingTask = false;
        window.todoApp.addingTaskCategoryId = null;
        window.todoApp.editingTaskId = null;
    }
    
    // 카테고리 생성
    async function createCategory(categoryData) {
        try {
            const response = await fetch('/api/topics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });
            
            if (!response.ok) {
                throw new Error('카테고리 생성 실패');
            }
            
            const newCategory = await response.json();
            
            // 카테고리를 즉시 추가하고 UI 업데이트
            window.todoApp.categories.push(newCategory);
            
            // 인라인 폼 제거
            const inlineForm = document.querySelector('.inline-form-container');
            if (inlineForm) {
                inlineForm.remove();
            }
            
            // 상태 초기화
            window.todoApp.isAddingCategory = false;
            
            // 현재 날짜의 할 일 목록 렌더링 (이걸로 대체하여 중복 삽입 방지)
            const dateStr = window.todoApp.formatSelectedDate();
            window.todoApp.renderTodosAndCategories(dateStr);
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
            return newCategory;
        } catch (error) {
            console.error('카테고리 생성 중 오류 발생:', error);
            alert('카테고리를 생성하는 중 오류가 발생했습니다.');
            return null;
        }
    }
    
    // 카테고리 업데이트
    async function updateCategory(categoryId, categoryData) {
        try {
            const response = await fetch(`/api/topics/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoryData)
            });
            
            if (!response.ok) {
                throw new Error('카테고리 수정 실패');
            }
            
            const updatedCategory = await response.json();
            
            // 로컬 카테고리 업데이트
            const index = window.todoApp.categories.findIndex(cat => cat.id === parseInt(categoryId));
            if (index !== -1) {
                window.todoApp.categories[index] = updatedCategory;
            }
            
            // UI 직접 업데이트 - 색상 적용
            const categoryContainer = document.querySelector(`.category-container[data-id="${categoryId}"]`);
            if (categoryContainer) {
                const categoryNameEl = categoryContainer.querySelector('.category-name');
                if (categoryNameEl) {
                    // 텍스트 색상을 카테고리 색상으로 설정
                    categoryNameEl.style.color = updatedCategory.color;
                    categoryNameEl.innerHTML = `
                        <i class="fas fa-tag"></i>
                        ${updatedCategory.name}
                    `;
                }
                
                // 숨겨진 카테고리 컨테이너 표시
                categoryContainer.style.display = 'block';
            }
            
            // 인라인 폼 제거
            const inlineForm = document.querySelector('.inline-form-container');
            if (inlineForm) {
                inlineForm.remove();
            }
            
            // 상태 초기화
            window.todoApp.isEditingCategory = false;
            window.todoApp.editingCategoryId = null;
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
            return updatedCategory;
        } catch (error) {
            console.error('카테고리 수정 중 오류 발생:', error);
            alert('카테고리를 수정하는 중 오류가 발생했습니다.');
            return null;
        }
    }
    
    // 카테고리 삭제 함수
    async function deleteCategory(categoryId) {
        try {
            const response = await fetch(`/api/topics/${categoryId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('카테고리 삭제 실패');
            }
            
            // 로컬 카테고리 배열에서 제거
            window.todoApp.categories = window.todoApp.categories.filter(cat => cat.id !== parseInt(categoryId));
            
            // UI에서 직접 제거
            const categoryContainer = document.querySelector(`.category-container[data-id="${categoryId}"]`);
            if (categoryContainer) {
                categoryContainer.remove();
            }
            
            // 카테고리가 없는 경우 빈 메시지 표시
            if (window.todoApp.categories.length === 0 && !document.querySelector('.category-container')) {
                tasksList.innerHTML = '<div class="empty-list">이 날짜에 등록된 할 일이 없습니다<br>아래 "카테고리 추가" 버튼을 눌러 새 카테고리를 만들어보세요.</div>';
            }
            
            // 달력 업데이트
            window.todoApp.renderCalendar();
            
        } catch (error) {
            console.error('카테고리 삭제 중 오류 발생:', error);
            alert('카테고리를 삭제하는 중 오류가 발생했습니다.');
        }
    }
    
    // 이벤트 핸들러
    function handleTasksListClick(e) {
        // 카테고리 삭제 버튼
        if (e.target.closest('.delete-category-btn')) {
            const btn = e.target.closest('.delete-category-btn');
            const categoryId = btn.dataset.category;
            
            if (confirm('이 카테고리를 삭제하시겠습니까? 카테고리에 속한 할 일들은 카테고리 없음으로 이동합니다.')) {
                deleteCategory(categoryId);
            }
            return;
        }
        
        // 카테고리 수정 버튼
        if (e.target.closest('.edit-category-btn')) {
            const btn = e.target.closest('.edit-category-btn');
            const categoryId = parseInt(btn.dataset.category);
            
            // 이미 다른 폼이 열려있으면 무시
            if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory || 
                window.todoApp.isAddingTask || window.todoApp.isEditingTask) return;
            
            const category = window.todoApp.categories.find(cat => cat.id === categoryId);
            if (category) {
                window.todoApp.isEditingCategory = true;
                window.todoApp.editingCategoryId = categoryId;
                renderInlineCategoryForm(category);
            }
            return;
        }
        
        // 할 일 추가 버튼
        if (e.target.closest('.add-task-btn')) {
            const btn = e.target.closest('.add-task-btn');
            const categoryId = btn.dataset.category;
            
            // 이미 다른 폼이 열려있으면 무시
            if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory || 
                window.todoApp.isAddingTask || window.todoApp.isEditingTask) return;
            
            // 인라인 폼 표시
            window.todoApp.isAddingTask = true;
            window.todoApp.addingTaskCategoryId = categoryId ? parseInt(categoryId) : null;
            renderInlineTaskForm(categoryId);
            return;
        }
        
        // 할 일 수정 버튼
        if (e.target.closest('.edit-task')) {
            const btn = e.target.closest('.edit-task');
            const todoId = parseInt(btn.dataset.id);
            
            // 이미 다른 폼이 열려있으면 무시
            if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory || 
                window.todoApp.isAddingTask || window.todoApp.isEditingTask) return;
            
            const todo = window.todoApp.todos.find(t => t.id === todoId);
            if (todo) {
                window.todoApp.isEditingTask = true;
                window.todoApp.editingTaskId = todoId;
                renderInlineTaskForm(todo.category_id, todo);
            }
            return;
        }
        
        // 할 일 삭제 버튼
        if (e.target.closest('.delete-task')) {
            const btn = e.target.closest('.delete-task');
            const todoId = btn.dataset.id;
            
            if (confirm('이 할 일을 삭제하시겠습니까?')) {
                // calendar_03.js의 함수 호출
                if (typeof deleteTodo === 'function') {
                    deleteTodo(todoId);
                } else if (typeof window.todoApp.deleteTodo === 'function') {
                    window.todoApp.deleteTodo(todoId);
                }
            }
            return;
        }
        
        // 할 일 핀 버튼
        if (e.target.closest('.pin-task')) {
            const btn = e.target.closest('.pin-task');
            const todoId = btn.dataset.id;
            // calendar_03.js의 함수 호출
            if (typeof toggleTodoPin === 'function') {
                toggleTodoPin(todoId);
            } else if (typeof window.todoApp.toggleTodoPin === 'function') {
                window.todoApp.toggleTodoPin(todoId);
            }
            return;
        }
    }
    
    // 인라인 폼 제출 처리
    function handleInlineFormSubmit(e) {
        if (e.target.id === 'inlineCategoryForm') {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const categoryName = formData.get('categoryName');
            const categoryColor = formData.get('categoryColor');
            const categoryId = formData.get('categoryId');
            
            if (!categoryName.trim()) {
                alert('카테고리 이름을 입력해주세요.');
                return;
            }
            
            const categoryData = {
                name: categoryName,
                color: categoryColor
            };
            
            if (categoryId) {
                // 카테고리 수정
                updateCategory(categoryId, categoryData);
            } else {
                // 카테고리 생성
                createCategory(categoryData);
            }
        } else if (e.target.id === 'inlineTaskForm') {
            e.preventDefault();
            
            const form = e.target;
            const formData = new FormData(form);
            const title = formData.get('taskTitle');
            const description = formData.get('taskDescription');
            const date = formData.get('taskDate');
            const categoryId = formData.get('categoryId');
            const taskId = formData.get('taskId');
            const pinned = formData.get('pinned') === 'true';
            
            if (!title.trim()) {
                alert('할 일 제목을 입력해주세요.');
                return;
            }
            
            const todoData = {
                title,
                description,
                date,
                pinned,
                category_id: categoryId ? parseInt(categoryId) : null
            };
            
            if (taskId) {
                // 할 일 수정 - calendar_03.js의 함수 호출
                if (typeof updateTodo === 'function') {
                    updateTodo(taskId, todoData);
                } else if (typeof window.todoApp.updateTodo === 'function') {
                    window.todoApp.updateTodo(taskId, todoData);
                }
            } else {
                // 할 일 추가 - calendar_03.js의 함수 호출
                if (typeof addTodo === 'function') {
                    addTodo(todoData);
                } else if (typeof window.todoApp.addTodo === 'function') {
                    window.todoApp.addTodo(todoData);
                }
            }
        }
    }
    
    // 인라인 폼 키 입력 처리 (ESC 키로 취소)
    function handleInlineFormKeydown(e) {
        if (e.key === 'Escape') {
            if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory) {
                cancelInlineForm();
            } else if (window.todoApp.isAddingTask || window.todoApp.isEditingTask) {
                cancelInlineTaskForm();
            }
        }
    }
    
    // 이벤트 리스너 등록
    document.addEventListener('addCategory', function() {
        // 이미 폼이 열려있으면 무시
        if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory || 
            window.todoApp.isAddingTask || window.todoApp.isEditingTask) return;
            
        window.todoApp.isAddingCategory = true;
        renderInlineCategoryForm();
    });
    
    // tasksList 이벤트 리스너 등록
    if (tasksList) {
        tasksList.addEventListener('click', handleTasksListClick);
        tasksList.addEventListener('submit', handleInlineFormSubmit);
    }
    
    // document 레벨 이벤트 리스너 등록
    document.addEventListener('keydown', handleInlineFormKeydown);
    
    // 카테고리 추가 버튼 클릭 이벤트 직접 등록
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            // 이미 다른 폼이 열려있으면 무시
            if (window.todoApp.isAddingCategory || window.todoApp.isEditingCategory || 
                window.todoApp.isAddingTask || window.todoApp.isEditingTask) return;
                
            window.todoApp.isAddingCategory = true;
            renderInlineCategoryForm();
        });
    }
    
    // window.todoApp에 함수 추가
    window.todoApp.renderInlineCategoryForm = renderInlineCategoryForm;
    window.todoApp.renderInlineTaskForm = renderInlineTaskForm;
    window.todoApp.cancelInlineForm = cancelInlineForm;
    window.todoApp.cancelInlineTaskForm = cancelInlineTaskForm;
    window.todoApp.createCategory = createCategory;
    window.todoApp.updateCategory = updateCategory;
    window.todoApp.deleteCategory = deleteCategory;
});