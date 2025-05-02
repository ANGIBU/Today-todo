// static/js/notifications.js
document.addEventListener('DOMContentLoaded', function() {
    const notificationsList = document.getElementById('notificationsList');
    const emptyNotifications = document.getElementById('emptyNotifications');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    // 알림 데이터 가져오기
    async function fetchNotifications() {
        try {
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('알림 데이터를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            renderNotifications(data);
        } catch (error) {
            console.error('알림 데이터 가져오기 오류:', error);
            showErrorState('알림 데이터를 불러올 수 없습니다.');
        }
    }
    
    // 알림 렌더링
    function renderNotifications(notifications) {
        notificationsList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsList.style.display = 'none';
            emptyNotifications.style.display = 'block';
            return;
        }
        
        notificationsList.style.display = 'block';
        emptyNotifications.style.display = 'none';
        
        notifications.forEach(notification => {
            const notificationElement = document.createElement('div');
            notificationElement.classList.add('notification-item');
            notificationElement.dataset.id = notification.id;
            
            if (!notification.read) {
                notificationElement.classList.add('unread');
            }
            
            // 알림 유형에 따른 아이콘 결정
            let iconClass;
            switch (notification.type) {
                case 'follow':
                    iconClass = 'fa-user-plus';
                    break;
                case 'like':
                    iconClass = 'fa-heart';
                    break;
                case 'mention':
                    iconClass = 'fa-at';
                    break;
                default:
                    iconClass = 'fa-bell';
            }
            
            notificationElement.innerHTML = `
                <div class="notification-icon ${notification.type}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-message">${notification.message}</div>
                    <div class="notification-time">${notification.created_at}</div>
                </div>
            `;
            
            // 클릭 시 알림 읽음으로 표시
            notificationElement.addEventListener('click', () => {
                markAsRead(notification.id);
                notificationElement.classList.remove('unread');
            });
            
            notificationsList.appendChild(notificationElement);
        });
    }
    
    // 알림 읽음으로 표시
    async function markAsRead(notificationId) {
        try {
            const response = await fetch('/api/notifications/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notification_ids: [notificationId] })
            });
            
            if (!response.ok) {
                throw new Error('알림 상태 변경 실패');
            }
        } catch (error) {
            console.error('알림 읽음 표시 오류:', error);
        }
    }
    
    // 모든 알림 삭제
    async function clearAllNotifications() {
        if (!confirm('모든 알림을 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const response = await fetch('/api/notifications/clear', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('알림 삭제 실패');
            }
            
            // UI 업데이트
            notificationsList.innerHTML = '';
            notificationsList.style.display = 'none';
            emptyNotifications.style.display = 'block';
            
        } catch (error) {
            console.error('알림 삭제 오류:', error);
            alert('알림을 삭제하는 중 오류가 발생했습니다.');
        }
    }
    
    // 오류 상태 표시
    function showErrorState(message) {
        notificationsList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>${message}</p>
            </div>
        `;
    }
    
    // 이벤트 리스너 등록
    clearAllBtn.addEventListener('click', clearAllNotifications);
    
    // 초기 데이터 로드
    fetchNotifications();
});