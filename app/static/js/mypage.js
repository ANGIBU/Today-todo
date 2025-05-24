// app/static/js/mypage.js
document.addEventListener('DOMContentLoaded', function() {
    const profileNickname = document.getElementById('profileNickname');
    const profileBio = document.getElementById('profileBio');
    const followersCount = document.getElementById('followersCount');
    const followingCount = document.getElementById('followingCount');
    const todosCount = document.getElementById('todosCount');
    
    // 사용자 프로필 데이터 가져오기
    async function fetchUserProfile() {
        try {
            const response = await fetch('/api/user/profile');
            if (!response.ok) {
                throw new Error('프로필 데이터를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            updateProfileUI(data);
        } catch (error) {
            console.error('프로필 데이터 가져오기 오류:', error);
            showErrorState('프로필 데이터를 불러올 수 없습니다.');
        }
    }
    
    // 완료된 할 일 개수 가져오기
    async function fetchCompletedTodosCount() {
        try {
            const response = await fetch('/api/todos');
            if (!response.ok) {
                throw new Error('할 일 데이터를 가져오는데 실패했습니다.');
            }
            const todos = await response.json();
            const completedCount = todos.filter(todo => todo.completed).length;
            
            if (todosCount) {
                todosCount.querySelector('.stat-value').textContent = completedCount;
            }
        } catch (error) {
            console.error('할 일 데이터 가져오기 오류:', error);
        }
    }
    
    // 프로필 UI 업데이트
    function updateProfileUI(profileData) {
        if (profileNickname) {
            profileNickname.textContent = profileData.nickname;
        }
        
        if (profileBio) {
            profileBio.textContent = profileData.bio || '소개글이 없습니다.';
        }
        
        if (followersCount) {
            followersCount.querySelector('.stat-value').textContent = profileData.followers_count || 0;
        }
        
        if (followingCount) {
            followingCount.querySelector('.stat-value').textContent = profileData.following_count || 0;
        }
        
        // 프로필 이미지 처리
        const profileImage = document.querySelector('.profile-image');
        if (profileImage && profileData.profile_image && profileData.profile_image !== 'default.jpg') {
            // 실제 프로필 이미지가 있는 경우
            const imgElement = document.createElement('img');
            imgElement.src = `/static/images/${profileData.profile_image}`;
            imgElement.alt = '프로필 이미지';
            imgElement.onerror = function() {
                // 이미지 로드 실패시 기본 아이콘 표시
                this.style.display = 'none';
            };
            
            const defaultIcon = profileImage.querySelector('.default-profile-icon');
            if (defaultIcon) {
                profileImage.insertBefore(imgElement, defaultIcon);
            }
        }
    }
    
    // 오류 상태 표시
    function showErrorState(message) {
        const profileSection = document.querySelector('.profile-section');
        if (profileSection) {
            profileSection.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    // 초기 데이터 로드
    fetchUserProfile();
    fetchCompletedTodosCount();
});