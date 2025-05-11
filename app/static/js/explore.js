// app/static/js/explore.js
document.addEventListener('DOMContentLoaded', function() {
    const followingUsersContainer = document.getElementById('followingUsers');
    const sharedTodosContainer = document.getElementById('sharedTodos');
    const recommendedUsersContainer = document.getElementById('recommendedUsers');
    
    // 사용자 데이터 가져오기
    async function fetchUsers() {
        try {
            const response = await fetch('/api/explore/users');
            if (!response.ok) {
                throw new Error('사용자 데이터를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            renderFollowingUsers(data.following);
            renderRecommendedUsers(data.recommended);
        } catch (error) {
            console.error('사용자 데이터 가져오기 오류:', error);
            showErrorState(followingUsersContainer, '사용자 데이터를 불러올 수 없습니다.');
            showErrorState(recommendedUsersContainer, '사용자 데이터를 불러올 수 없습니다.');
        }
    }
    
    // 공유된 할 일 가져오기
    async function fetchSharedTodos() {
        try {
            const response = await fetch('/api/explore/todos');
            if (!response.ok) {
                throw new Error('할 일 데이터를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            renderSharedTodos(data);
        } catch (error) {
            console.error('할 일 데이터 가져오기 오류:', error);
            showErrorState(sharedTodosContainer, '할 일 데이터를 불러올 수 없습니다.');
        }
    }
    
    // 팔로우 중인 사용자 렌더링
    function renderFollowingUsers(users) {
        followingUsersContainer.innerHTML = '';
        
        if (users.length === 0) {
            followingUsersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-friends"></i>
                    <p>아직 팔로우한 사용자가 없습니다.<br>관심 있는 사용자를 팔로우해보세요!</p>
                </div>
            `;
            return;
        }
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('user-card');
            
            userElement.innerHTML = `
                <div class="user-avatar">
                    <img src="/static/images/${user.profile_image}" alt="${user.nickname}">
                </div>
                <div class="user-name">${user.nickname}</div>
            `;
            
            userElement.addEventListener('click', () => {
                // 사용자 프로필 페이지로 이동 (미구현)
                console.log(`사용자 ${user.id} 프로필 보기`);
            });
            
            followingUsersContainer.appendChild(userElement);
        });
    }
    
    // 공유된 할 일 렌더링
    function renderSharedTodos(todos) {
        sharedTodosContainer.innerHTML = '';
        
        if (todos.length === 0) {
            sharedTodosContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tasks"></i>
                    <p>팔로우 중인 사용자의 할 일이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        todos.forEach(todo => {
            const todoElement = document.createElement('div');
            todoElement.classList.add('shared-todo-item');
            
            // 카테고리가 있으면 해당 색상으로 좌측 보더 설정
            if (todo.category_color) {
                todoElement.style.borderLeftColor = todo.category_color;
            }
            
            todoElement.innerHTML = `
                <div class="shared-todo-header">
                    <div class="todo-user-avatar">
                        <img src="/static/images/${todo.user.profile_image}" alt="${todo.user.nickname}">
                    </div>
                    <div class="todo-user-info">
                        <div class="todo-user-name">${todo.user.nickname}</div>
                        <div class="todo-date">${todo.date}</div>
                    </div>
                </div>
                <div class="shared-todo-content">
                    <div class="todo-title">${todo.title}</div>
                    ${todo.description ? `<div class="todo-description">${todo.description}</div>` : ''}
                    ${todo.category ? `
                        <div class="todo-category" style="color: ${todo.category_color}">
                            <i class="fas fa-tag"></i> ${todo.category}
                        </div>
                    ` : ''}
                </div>
            `;
            
            sharedTodosContainer.appendChild(todoElement);
        });
    }
    
    // 추천 사용자 렌더링
    function renderRecommendedUsers(users) {
        recommendedUsersContainer.innerHTML = '';
        
        if (users.length === 0) {
            recommendedUsersContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>추천할 사용자가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.classList.add('recommended-user-card');
            userElement.dataset.userId = user.id;
            
            userElement.innerHTML = `
                <div class="recommended-user-avatar">
                    <img src="/static/images/${user.profile_image}" alt="${user.nickname}">
                </div>
                <div class="recommended-user-name">${user.nickname}</div>
                <button class="follow-btn" data-user-id="${user.id}">
                    ${user.is_following ? '팔로잉' : '팔로우'}
                </button>
            `;
            
            // 팔로우 버튼에 이벤트 리스너 추가
            const followBtn = userElement.querySelector('.follow-btn');
            if (user.is_following) {
                followBtn.classList.add('following');
            }
            
            followBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFollow(user.id, followBtn);
            });
            
            recommendedUsersContainer.appendChild(userElement);
        });
    }
    
    // 팔로우/언팔로우 토글
    async function toggleFollow(userId, button) {
        try {
            const isFollowing = button.classList.contains('following');
            const url = isFollowing 
                ? `/api/users/${userId}/unfollow` 
                : `/api/users/${userId}/follow`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('요청 실패');
            }
            
            // UI 업데이트
            if (isFollowing) {
                button.textContent = '팔로우';
                button.classList.remove('following');
            } else {
                button.textContent = '팔로잉';
                button.classList.add('following');
            }
            
            // 데이터 다시 로드 (선택적)
            fetchUsers();
            fetchSharedTodos();
            
        } catch (error) {
            console.error('팔로우 상태 변경 오류:', error);
            alert('팔로우 상태를 변경하는 중 오류가 발생했습니다.');
        }
    }
    
    // 오류 상태 표시
    function showErrorState(container, message) {
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    // 초기 데이터 로드
    fetchUsers();
    fetchSharedTodos();
});