// static/js/calendar_01.js
document.addEventListener('DOMContentLoaded', function() {
    // 현재 날짜 정보 가져오기
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    // 선택된 날짜 (기본값은 오늘)
    let selectedDate = new Date(currentDate);
    
    // DOM 요소
    const calendarBody = document.getElementById('calendarBody');
    const currentYearMonth = document.getElementById('currentYearMonth');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const tasksList = document.getElementById('tasksList');
    
    // 인라인 편집 관련 상태
    let isAddingCategory = false;
    let isEditingCategory = false;
    let editingCategoryId = null;
    let isAddingTask = false;
    let addingTaskCategoryId = null;
    let isEditingTask = false;
    let editingTaskId = null;
    
    // 할 일 데이터 (실제로는 API에서 가져옴)
    let todos = [];
    let categories = [];
    
    // 달력 초기화
    function initCalendar() {
        // 다음달, 이전달 버튼 이벤트
        prevMonthBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar();
        });
    
        nextMonthBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar();
        });
    
        // 카테고리 추가 버튼 클릭 이벤트
        addCategoryBtn.addEventListener('click', () => {
            // 이미 추가/수정 중이면 무시
            if (isAddingCategory || isEditingCategory || isAddingTask || isEditingTask) return;
            
            isAddingCategory = true;
            
            // 이벤트 발생시켜 calendar_02.js에 알림
            document.dispatchEvent(new CustomEvent('addCategory'));
        });
    
        // 초기 데이터 로드 및 렌더링
        Promise.all([fetchTodos(), fetchCategories()]).then(() => {
            renderCalendar();
            renderTodosAndCategories(formatDate(selectedDate));
        });
    }
    
    // 날짜 형식 변환 (YYYY-MM-DD)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // 화면에 표시할 날짜 형식 (YYYY년 MM월 DD일)
    function formatDisplayDate(date) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}년 ${month}월 ${day}일`;
    }
    
    // 선택된 날짜 형식 변환
    function formatSelectedDate() {
        const selectedDay = document.querySelector('.day.selected');
        if (!selectedDay) return formatDate(new Date());
        
        const day = parseInt(selectedDay.textContent);
        const currentMonth = parseInt(document.getElementById('currentYearMonth').textContent.match(/(\d+)월/)[1]) - 1;
        const currentYear = parseInt(document.getElementById('currentYearMonth').textContent.match(/(\d+)년/)[1]);
        
        // 이전달/다음달 날짜인지 확인
        if (selectedDay.classList.contains('other-month')) {
            if (parseInt(selectedDay.textContent) > 20) {
                // 이전달
                const date = new Date(currentYear, currentMonth - 1, day);
                return formatDate(date);
            } else {
                // 다음달
                const date = new Date(currentYear, currentMonth + 1, day);
                return formatDate(date);
            }
        } else {
            const date = new Date(currentYear, currentMonth, day);
            return formatDate(date);
        }
    }
    
    // 날짜 요소 생성 함수 - 수정된 부분
    function createDayElement(day, isCurrentMonth, isToday, isSelected, hasTodo, dateObj, dateStr) {
        const cellContainer = document.createElement('div');
        cellContainer.style.width = '100%';
        cellContainer.style.height = '100%';
        
        // 날짜 부분
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.textContent = day;
        
        if (!isCurrentMonth) {
            dayDiv.classList.add('other-month');
        }
        
        if (isToday) {
            dayDiv.classList.add('today');
        }
        
        if (isSelected) {
            dayDiv.classList.add('selected');
            dayDiv.style.backgroundColor = '#f5f5f5'; // 선택된 날짜에 hover 효과 유지
        }
        
        if (hasTodo) {
            dayDiv.classList.add('has-todo');
        }
        
        cellContainer.appendChild(dayDiv);
        
        // 현재 월의 날짜만 클릭 및 hover 가능
        if (dateObj && isCurrentMonth) {
            dayDiv.addEventListener('click', () => {
                // 기존 선택 해제 및 hover 효과 제거
                const selectedDays = document.querySelectorAll('.day.selected');
                selectedDays.forEach(day => {
                    day.classList.remove('selected');
                    day.style.backgroundColor = ''; // hover 효과 제거
                });
                
                // 새로운 날짜 선택
                dayDiv.classList.add('selected');
                dayDiv.style.backgroundColor = '#f5f5f5'; // 선택된 날짜에 hover 효과 유지
                selectedDate = new Date(dateObj);
                
                // 날짜 문자열 가져오기
                const dateStr = formatDate(selectedDate);
                
                // 할 일 목록 렌더링
                renderTodosAndCategories(dateStr);
                
                // 날짜 변경 이벤트 발생 (일기장 업데이트용)
                document.dispatchEvent(new CustomEvent('dateChanged', { 
                    detail: { date: dateStr } 
                }));
            });
            
            // hover 효과 - 스타일 변경 없이 배경색만 변경
            dayDiv.addEventListener('mouseenter', () => {
                if (!dayDiv.classList.contains('selected')) {
                    dayDiv.style.backgroundColor = '#f5f5f5';
                }
            });
            
            dayDiv.addEventListener('mouseleave', () => {
                if (!dayDiv.classList.contains('selected')) {
                    dayDiv.style.backgroundColor = '';
                }
            });
        } else {
            // 이전/다음 월 날짜는 비활성화 스타일 적용
            dayDiv.style.cursor = 'default';
        }
        
        return cellContainer;
    }
    
    // 오늘 날짜인지 확인
    function isToday(date) {
        const today = new Date();
        return date.getDate() === today.getDate() && 
               date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
    }
    
    // 선택된 날짜인지 확인
    function isSelectedDate(date) {
        return date.getDate() === selectedDate.getDate() && 
               date.getMonth() === selectedDate.getMonth() && 
               date.getFullYear() === selectedDate.getFullYear();
    }
    
    // 해당 날짜에 할 일이 있는지 확인
    function hasTodo(dateStr) {
        return todos.some(todo => todo.date === dateStr);
    }
    
    // 달력 렌더링
    function renderCalendar() {
        // 년월 표시 업데이트 - 중앙 정렬
        currentYearMonth.textContent = `${currentYear}년 ${currentMonth + 1}월`;
        
        // 달력 테이블 본문 초기화
        calendarBody.innerHTML = '';
        
        // 해당 월의 첫 날과 마지막 날 구하기
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // 첫 날의 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
        // 월요일을 시작으로 하기 위해 조정
        let firstDayOfWeek = firstDay.getDay() - 1;
        if (firstDayOfWeek < 0) firstDayOfWeek = 6; // 일요일인 경우 6으로 조정
        
        // 해당 월의 일수
        const daysInMonth = lastDay.getDate();
        
        // 이전 달의 마지막 날짜
        const prevMonthLastDate = new Date(currentYear, currentMonth, 0).getDate();
        
        // 행 생성 (주별로)
        let date = 1;
        let nextMonthDate = 1;
        
        // 필요한 행 수 계산
        const weeksNeeded = Math.ceil((firstDayOfWeek + daysInMonth) / 7);
        
        // 항상 6주 구성으로 유지하기 위한 처리
        const totalWeeks = 6;
        
        for (let week = 0; week < totalWeeks; week++) {
            const row = document.createElement('tr');
            
            for (let day = 0; day < 7; day++) {
                const cell = document.createElement('td');
                
                if (week < weeksNeeded) {
                    // 실제 날짜 표시
                    if (week === 0 && day < firstDayOfWeek) {
                        // 이전 달 날짜
                        const prevDate = prevMonthLastDate - firstDayOfWeek + day + 1;
                        const dayDiv = createDayElement(prevDate, false);
                        cell.appendChild(dayDiv);
                    } else if (date > daysInMonth) {
                        // 다음 달 날짜
                        const dayDiv = createDayElement(nextMonthDate, false);
                        cell.appendChild(dayDiv);
                        nextMonthDate++;
                    } else {
                        // 현재 달 날짜
                        const currentDate = new Date(currentYear, currentMonth, date);
                        const dateStr = formatDate(currentDate);
                        
                        // 날짜 요소 생성
                        const dayDiv = createDayElement(
                            date, 
                            true, 
                            isToday(currentDate),
                            isSelectedDate(currentDate),
                            hasTodo(dateStr),
                            currentDate,
                            dateStr
                        );
                        
                        cell.appendChild(dayDiv);
                        date++;
                    }
                } else {
                    // 추가 주 - 빈 셀 추가
                    const emptyDiv = document.createElement('div');
                    emptyDiv.classList.add('day', 'empty-day');
                    emptyDiv.style.visibility = 'hidden'; // 보이지 않게 하지만 공간은 차지
                    cell.appendChild(emptyDiv);
                }
                
                row.appendChild(cell);
            }
            
            calendarBody.appendChild(row);
        }
        
        // 달력 크기 조정
        adjustCalendarSize();
    }
    
    // 화면 크기에 맞게 달력 크기 조정
    function adjustCalendarSize() {
        const days = document.querySelectorAll('.day');
        const calendarContainer = document.querySelector('.calendar-container');
        const containerHeight = calendarContainer.clientHeight;
        
        // 헤더와 요일 표시 영역 제외
        const headerHeight = 40; // calendar-header 높이
        const thHeight = 36; // th 높이
        const availableHeight = containerHeight - (headerHeight + thHeight);
        
        // 항상 6줄 기준으로 크기 계산 (월별 최대 6주)
        const cellHeight = Math.floor(availableHeight / 6);
        
        // 각 셀의 높이 설정
        const tds = document.querySelectorAll('.calendar-table td');
        tds.forEach(td => {
            td.style.height = `${cellHeight}px`;
        });
        
        // 날짜 요소의 높이 설정
        days.forEach(day => {
            day.style.height = '100%';
        });
    }
    
    // API에서 할 일 목록 가져오기
    async function fetchTodos() {
        try {
            const response = await fetch('/api/todos');
            todos = await response.json();
            return todos;
        } catch (error) {
            console.error('할 일을 가져오는 중 오류 발생:', error);
            return [];
        }
    }
    
    // API에서 카테고리 목록 가져오기
    async function fetchCategories() {
        try {
            const response = await fetch('/api/topics');
            categories = await response.json();
            return categories;
        } catch (error) {
            console.error('카테고리를 가져오는 중 오류 발생:', error);
            return [];
        }
    }
    
    // 할 일 항목 렌더링
    function renderTodoItem(todo, container) {
        const taskItem = document.createElement('div');
        taskItem.classList.add('task-item');
        taskItem.dataset.id = todo.id;
        
        // 완료 상태에 따른 클래스 추가
        if (todo.completed) {
            taskItem.classList.add('completed');
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
                <button class="edit-task" data-id="${todo.id}"><i class="fas fa-edit"></i></button>
                <button class="delete-task" data-id="${todo.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        container.appendChild(taskItem);
        
        // 체크박스 이벤트 등록
        const checkbox = taskItem.querySelector(`#task-${todo.id}`);
        checkbox.addEventListener('change', function() {
            document.dispatchEvent(new CustomEvent('toggleTodo', { 
                detail: { todoId: todo.id, completed: this.checked } 
            }));
        });
    }
    
    // 날짜별 할 일 및 카테고리 렌더링
    function renderTodosAndCategories(dateStr) {
        // 할 일 목록 초기화
        tasksList.innerHTML = '';
        
        // 해당 날짜의 할 일 필터링
        const dayTodos = todos.filter(todo => todo.date === dateStr);
        
        if (dayTodos.length === 0 && categories.length === 0 && !isAddingCategory) {
            // 할 일과 카테고리가 모두 없을 경우
            tasksList.innerHTML = '<div class="empty-list">이 날짜에 등록된 할 일이 없습니다<br>아래 "카테고리 추가" 버튼을 눌러 새 카테고리를 만들어보세요.</div>';
            return;
        }
    
        // 카테고리별로 할 일 그룹화
        const todosByCategory = {};
        const todosWithoutCategory = [];
        
        // 모든 카테고리를 먼저 추가
        categories.forEach(category => {
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
        
        // 카테고리별 할 일 렌더링
        for (const categoryId in todosByCategory) {
            const category = categories.find(cat => cat.id === parseInt(categoryId));
            if (!category) continue;
            
            const categoryContainer = document.createElement('div');
            categoryContainer.classList.add('category-container');
            categoryContainer.dataset.id = category.id;
            
            // 카테고리 색상을 텍스트 색상으로 설정
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
            if (todosByCategory[categoryId].length === 0) {
                categoryTasksContainer.innerHTML = '<div class="empty-category-tasks">이 카테고리에 할 일이 없습니다</div>';
            } else {
                // 할 일 목록 렌더링
                todosByCategory[categoryId].forEach(todo => {
                    renderTodoItem(todo, categoryTasksContainer);
                });
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
    }
    
    // 공유 변수 및 함수를 window 객체에 추가
    window.todoApp = {
        todos: todos,
        categories: categories,
        selectedDate: selectedDate,
        currentMonth: currentMonth,
        currentYear: currentYear,
        isAddingCategory: isAddingCategory,
        isEditingCategory: isEditingCategory,
        editingCategoryId: editingCategoryId,
        isAddingTask: isAddingTask,
        addingTaskCategoryId: addingTaskCategoryId,
        isEditingTask: isEditingTask,
        editingTaskId: editingTaskId,
        formatDate: formatDate,
        formatSelectedDate: formatSelectedDate,
        renderCalendar: renderCalendar,
        renderTodosAndCategories: renderTodosAndCategories,
        fetchTodos: fetchTodos,
        fetchCategories: fetchCategories
    };
    
    // 윈도우 크기 변경 시 달력 크기 조정
    window.addEventListener('resize', adjustCalendarSize);
    
    // 달력 초기화
    initCalendar();
});