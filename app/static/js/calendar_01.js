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
    
    // 로컬 데이터
    let todos = [];
    let categories = [];
    
    // 장치 ID 가져오기 (로컬 스토리지에서)
    function getDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            // 장치 ID가 없으면 생성하여 저장
            deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }
    
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
        loadInitialData();
    }
    
    // 초기 데이터 로드
    async function loadInitialData() {
        try {
            console.log('초기 데이터 로드 시작');
            // 카테고리와 할일 데이터 로드
            await Promise.all([fetchTodos(), fetchCategories()]);
            
            // 로그인 상태에 따라 로컬 스토리지 처리
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            console.log('로그인 상태:', isLoggedIn);
            
            if (!isLoggedIn) {
                // 로컬 스토리지에서 비로그인 사용자 데이터 로드
                loadLocalData();
            }
            
            // 달력 및 할일 목록 렌더링
            renderCalendar();
            renderTodosAndCategories(formatDate(selectedDate));
            
            // 데이터 로드 상태 표시
            console.log('데이터 로드 완료:', { categories: categories.length, todos: todos.length });
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
        }
    }
    
    // 비로그인 사용자 데이터 로컬 스토리지에서 로드
    function loadLocalData() {
        console.log('로컬 데이터 로드 시작');
        const deviceId = getDeviceId();
        console.log('장치 ID:', deviceId);
        
        // 로컬 스토리지에서 카테고리 데이터 로드
        const storedCategories = localStorage.getItem(`categories_${deviceId}`);
        if (storedCategories) {
            const parsedCategories = JSON.parse(storedCategories);
            console.log('로컬 카테고리 데이터:', parsedCategories);
            // 중복 방지를 위해 ID 기준으로 병합
            parsedCategories.forEach(localCat => {
                if (!categories.some(cat => cat.id === localCat.id)) {
                    categories.push(localCat);
                }
            });
        }
        
        // 로컬 스토리지에서 할일 데이터 로드
        const storedTodos = localStorage.getItem(`todos_${deviceId}`);
        if (storedTodos) {
            const parsedTodos = JSON.parse(storedTodos);
            console.log('로컬 할일 데이터:', parsedTodos);
            // 중복 방지를 위해 ID 기준으로 병합
            parsedTodos.forEach(localTodo => {
                if (!todos.some(todo => todo.id === localTodo.id)) {
                    // 날짜 문자열을 Date 객체로 변환
                    if (localTodo.date && typeof localTodo.date === 'string') {
                        localTodo.date = new Date(localTodo.date);
                    }
                    todos.push(localTodo);
                }
            });
        }
    }
    
    // 비로그인 사용자 데이터 로컬 스토리지에 저장
    function saveLocalData() {
        const deviceId = getDeviceId();
        
        // 카테고리 데이터 저장
        localStorage.setItem(`categories_${deviceId}`, JSON.stringify(categories));
        
        // 할일 데이터 저장
        localStorage.setItem(`todos_${deviceId}`, JSON.stringify(todos));
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
        return todos.some(todo => 
            formatDate(new Date(todo.date)) === dateStr || 
            (todo.pinned === true)
        );
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
            console.log('API 요청 시작: /api/todos');
            const response = await fetch('/api/todos');
            console.log('API 응답 상태:', response.status, response.statusText);
            
            if (!response.ok) {
                console.error('응답 상태 오류:', response.status, response.statusText);
                throw new Error('Todo 데이터 로드 실패');
            }
            
            const result = await response.json();
            console.log('받은 데이터:', result);
            
            // 날짜 문자열을 Date 객체로 변환
            todos = result.map(todo => {
                if (todo.date && typeof todo.date === 'string') {
                    return { ...todo, date: new Date(todo.date) };
                }
                return todo;
            });
            
            // 비로그인 사용자인 경우 로컬 저장
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            console.log('로그인 상태:', isLoggedIn);
            
            if (!isLoggedIn) {
                saveLocalData();
            }
            
            return todos;
        } catch (error) {
            console.error('할 일을 가져오는 중 오류 발생:', error);
            return [];
        }
    }
    
    // API에서 카테고리 목록 가져오기
    async function fetchCategories() {
        try {
            console.log('API 요청 시작: /api/topics');
            const response = await fetch('/api/topics');
            console.log('API 응답 상태:', response.status, response.statusText);
            
            if (!response.ok) {
                console.error('응답 상태 오류:', response.status, response.statusText);
                throw new Error('Category 데이터 로드 실패');
            }
            
            categories = await response.json();
            console.log('받은 카테고리 데이터:', categories);
            
            // 비로그인 사용자인 경우 로컬 저장
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            if (!isLoggedIn) {
                saveLocalData();
            }
            
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
            document.dispatchEvent(new CustomEvent('toggleTodo', { 
                detail: { todoId: todo.id, completed: this.checked } 
            }));
        });
    }
    
    // 날짜별 할 일 및 카테고리 렌더링 함수
    function renderTodosAndCategories(dateStr) {
        // todoApp 객체에 정의된 렌더링 함수 사용
        if (window.todoApp && window.todoApp.renderTodosAndCategories) {
            window.todoApp.renderTodosAndCategories(dateStr);
        } else {
            console.error('렌더링 함수를 찾을 수 없습니다');
        }
    }
    
    // 애플리케이션 상태 공유
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
        fetchCategories: fetchCategories,
        saveLocalData: saveLocalData,
        loadLocalData: loadLocalData,
        getDeviceId: getDeviceId
    };
    
    // 윈도우 크기 변경 시 달력 크기 조정
    window.addEventListener('resize', adjustCalendarSize);
    
    // 달력 초기화
    initCalendar();
});