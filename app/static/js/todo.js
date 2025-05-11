// static/js/todo.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const todoModal = document.getElementById('todoModal');
    const categoryModal = document.getElementById('categoryModal');
    const editCategoryModal = document.getElementById('editCategoryModal');
    const categoryForm = document.getElementById('categoryForm');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const todoForm = document.getElementById('todoForm');
    const todoCategory = document.getElementById('todoCategory');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const tasksList = document.getElementById('tasksList');
    
    // 카테고리 데이터
    let categories = [];

    // 초기화
    initTodo();
    
    // 초기화 함수
    async function initTodo() {
        // 카테고리 불러오기
        await fetchCategories();
        
        // 카테고리 추가 버튼 이벤트
        addCategoryBtn.addEventListener('click', () => {
            categoryModal.style.display = 'block';
        });
        
        // 해당 카테고리 내의 할 일 추가 버튼 이벤트 (이벤트 위임)
        tasksList.addEventListener('click', (e) => {
            if (e.target.closest('.add-task-btn')) {
                const btn = e.target.closest('.add-task-btn');
                const categoryId = btn.dataset.category;
                const selectedDay = document.querySelector('.day.selected');
                
                if (selectedDay) {
                    const date = formatSelectedDate();
                    openAddTaskModal(categoryId, date);
                } else {
                    alert('먼저, 날짜를 선택해주세요.');
                }
            }
            
            // 카테고리 수정 버튼 이벤트
            if (e.target.closest('.edit-category-btn')) {
                const btn = e.target.closest('.edit-category-btn');
                const categoryId = btn.dataset.category;
                openEditCategoryModal(categoryId);
            }
            
            // 카테고리 삭제 버튼 이벤트
            if (e.target.closest('.delete-category-btn')) {
                const btn = e.target.closest('.delete-category-btn');
                const categoryId = btn.dataset.category;
                
                if (confirm('이 카테고리를 삭제하시겠습니까? 카테고리에 속한 할 일들은 카테고리 없음으로 이동합니다.')) {
                    deleteCategory(categoryId);
                }
            }
        });
        
        // 카테고리 폼 제출 이벤트
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('categoryName').value;
            const color = document.querySelector('input[name="categoryColor"]:checked').value;
            
            if (!name.trim()) {
                alert('카테고리 이름을 입력해주세요.');
                return;
            }
            
            await createCategory({ name, color });
            
            categoryModal.style.display = 'none';
            categoryForm.reset();
        });
        
        // 카테고리 수정 폼 제출 이벤트
        editCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const categoryId = document.getElementById('editCategoryId').value;
            const name = document.getElementById('editCategoryName').value;
            const color = document.querySelector('input[name="editCategoryColor"]:checked').value;
            
            if (!name.trim()) {
                alert('카테고리 이름을 입력해주세요.');
                return;
            }
            
            await updateCategory(categoryId, { name, color });
            
            editCategoryModal.style.display = 'none';
            editCategoryForm.reset();
        });
    }
    
    // 카테고리 불러오기
    async function fetchCategories() {
        try {
            const response = await fetch('/api/topics');
            categories = await response.json();
            updateCategoryOptions();
            return categories;
        } catch (error) {
            console.error('카테고리 불러오기 실패:', error);
            return [];
        }
    }
    
    // 카테고리 선택 옵션 업데이트
    function updateCategoryOptions() {
        // 기존 옵션 초기화 (첫 번째 기본 옵션 제외)
        while (todoCategory.options.length > 1) {
            todoCategory.remove(1);
        }
        
        // 카테고리 옵션 추가
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            todoCategory.appendChild(option);
        });
    }
    
    // 할 일 추가 모달 열기
    function openAddTaskModal(categoryId, date) {
        todoModal.style.display = 'block';
        document.getElementById('modalTitle').textContent = '할 일 추가';
        todoForm.reset();
        document.getElementById('todoDate').value = date;
        document.getElementById('todoCategory').value = categoryId;
        document.getElementById('todoId').value = '';
    }
    
    // 카테고리 수정 모달 열기
    function openEditCategoryModal(categoryId) {
        const category = categories.find(cat => cat.id === parseInt(categoryId));
        
        if (!category) {
            alert('카테고리를 찾을 수 없습니다.');
            return;
        }
        
        document.getElementById('editCategoryId').value = category.id;
        document.getElementById('editCategoryName').value = category.name;
        
        // 색상 라디오 버튼 설정
        const radioButtons = document.querySelectorAll('input[name="editCategoryColor"]');
        let matched = false;
        
        for (const radio of radioButtons) {
            if (radio.value === category.color) {
                radio.checked = true;
                matched = true;
                break;
            }
        }
        
        // 일치하는 색상이 없으면 첫 번째 옵션 선택
        if (!matched) {
            radioButtons[0].checked = true;
        }
        
        editCategoryModal.style.display = 'block';
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
            categories.push(newCategory);
            updateCategoryOptions();
            
            // 선택된 날짜가 있으면 해당 날짜의 할 일 목록 다시 렌더링
            const selectedDay = document.querySelector('.day.selected');
            if (selectedDay) {
                const date = formatSelectedDate();
                document.dispatchEvent(new CustomEvent('category-created', { 
                    detail: { category: newCategory, date } 
                }));
            }
            
            return newCategory;
        } catch (error) {
            console.error('카테고리 생성 중 오류 발생:', error);
            alert('카테고리를 생성하는 중 오류가 발생했습니다.');
            return null;
        }
    }
    
    // 카테고리 수정
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
            const index = categories.findIndex(cat => cat.id === parseInt(categoryId));
            if (index !== -1) {
                categories[index] = updatedCategory;
            }
            
            // 카테고리 선택 옵션 업데이트
            updateCategoryOptions();
            
            // 할 일 목록 다시 렌더링
            const selectedDay = document.querySelector('.day.selected');
            if (selectedDay) {
                const date = formatSelectedDate();
                document.dispatchEvent(new CustomEvent('category-created', { 
                    detail: { category: updatedCategory, date } 
                }));
            }
            
            return updatedCategory;
        } catch (error) {
            console.error('카테고리 수정 중 오류 발생:', error);
            alert('카테고리를 수정하는 중 오류가 발생했습니다.');
            return null;
        }
    }
    
    // 카테고리 삭제
    async function deleteCategory(categoryId) {
        try {
            const response = await fetch(`/api/topics/${categoryId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error('카테고리 삭제 실패');
            }
            
            // 로컬 카테고리 배열에서 제거
            categories = categories.filter(cat => cat.id !== parseInt(categoryId));
            
            // 카테고리 선택 옵션 업데이트
            updateCategoryOptions();
            
            // 할 일 목록 다시 렌더링
            const selectedDay = document.querySelector('.day.selected');
            if (selectedDay) {
                const date = formatSelectedDate();
                document.dispatchEvent(new CustomEvent('category-created', { 
                    detail: { date } 
                }));
            }
            
        } catch (error) {
            console.error('카테고리 삭제 중 오류 발생:', error);
            alert('카테고리를 삭제하는 중 오류가 발생했습니다.');
        }
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
    
    // 날짜 형식 변환 (YYYY-MM-DD)
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
});