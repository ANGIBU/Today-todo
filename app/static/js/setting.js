// app/static/js/settings.js
document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const nicknameInput = document.getElementById('nickname');
    const bioInput = document.getElementById('bio');
    const followNotificationToggle = document.getElementById('followNotification');
    const todoNotificationToggle = document.getElementById('todoNotification');
    
    // 프로필 폼 제출 처리
    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nickname = nicknameInput.value.trim();
            const bio = bioInput.value.trim();
            
            if (!nickname) {
                alert('닉네임을 입력해주세요.');
                nicknameInput.focus();
                return;
            }
            
            try {
                const response = await fetch('/api/user/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nickname,
                        bio
                    })
                });
                
                if (!response.ok) {
                    throw new Error('프로필 업데이트 실패');
                }
                
                // 성공 메시지 표시
                showSuccessMessage('프로필이 성공적으로 업데이트되었습니다.');
                
            } catch (error) {
                console.error('프로필 업데이트 오류:', error);
                alert('프로필을 업데이트하는 중 오류가 발생했습니다.');
            }
        });
    }
    
    // 알림 토글 처리
    if (followNotificationToggle) {
        followNotificationToggle.addEventListener('change', function() {
            saveNotificationSetting('follow', this.checked);
        });
    }
    
    if (todoNotificationToggle) {
        todoNotificationToggle.addEventListener('change', function() {
            saveNotificationSetting('todo', this.checked);
        });
    }
    
    // 알림 설정 저장 (로컬 스토리지에 저장)
    function saveNotificationSetting(type, enabled) {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        settings[type] = enabled;
        localStorage.setItem('notificationSettings', JSON.stringify(settings));
        
        console.log(`${type} 알림 설정이 ${enabled ? '활성화' : '비활성화'}되었습니다.`);
    }
    
    // 알림 설정 로드
    function loadNotificationSettings() {
        const settings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        
        if (followNotificationToggle) {
            followNotificationToggle.checked = settings.follow !== false; // 기본값은 true
        }
        
        if (todoNotificationToggle) {
            todoNotificationToggle.checked = settings.todo !== false; // 기본값은 true
        }
    }
    
    // 성공 메시지 표시
    function showSuccessMessage(message) {
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('success-message');
        messageContainer.textContent = message;
        
        // 폼 위에 추가
        profileForm.parentNode.insertBefore(messageContainer, profileForm);
        
        // 3초 후 자동으로 사라짐
        setTimeout(() => {
            messageContainer.style.opacity = '0';
            setTimeout(() => {
                messageContainer.remove();
            }, 300);
        }, 3000);
    }
    
    // 초기 설정 로드
    loadNotificationSettings();
});