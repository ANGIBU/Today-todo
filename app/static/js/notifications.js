// app/static/js/notifications.js
document.addEventListener('DOMContentLoaded', function() {
    const notificationBtn = document.getElementById('notificationBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const notificationsSidebar = document.getElementById('notificationsSidebar');
    const notificationsList = document.getElementById('notificationsList');
    const emptyNotifications = document.getElementById('emptyNotifications');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // 알림 사이드바 열기
    notificationBtn.addEventListener('click', function() {
        notificationsSidebar.classList.add('open');
        sidebarOverlay.classList.add('open');
        fetchNotifications();
        this.classList.remove('has-new-notifications');
    });
    
    // 알림 사이드바 닫기
    closeSidebarBtn.addEventListener('click', function() {
        notificationsSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
    
    // 오버레이 클릭 시 사이드바 닫기
    sidebarOverlay.addEventListener('click', function() {
        notificationsSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
    });
    
    // 알림 데이터 가져오기
    async function fetchNotifications() {
        try {
            notificationsList.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <span>로딩 중...</span>
                </div>
            `;
            
            const response = await fetch('/api/notifications');
            if (!response.ok) {
                throw new Error('알림 데이터를 가져오는데 실패했습니다.');
            }
            const data = await response.json();
            renderNotifications(data);
        } catch (error) {
            console.error('알림 데이터 가져오기 오류:', error);
            notificationsList.innerHTML = `
                <div class="error-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>알림 데이터를 불러올 수 없습니다.</p>
                </div>
            `;
        }
    }
    
    // 알림 렌더링
    function renderNotifications(notifications) {
        notificationsList.innerHTML = '';
        
        if (notifications.length === 0) {
            notificationsList.style.display = 'none';
            emptyNotifications.style.display = 'flex';
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
            
            // 알림 수 업데이트
            checkNotifications();
        } catch (error) {
            console.error('알림 읽음 표시 오류:', error);
        }
    }
    
    // 모든 알림 삭제
    clearAllBtn.addEventListener('click', async function() {
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
            emptyNotifications.style.display = 'flex';
            
            // 알림 배지 업데이트
            checkNotifications();
            
        } catch (error) {
            console.error('알림 삭제 오류:', error);
            alert('알림을 삭제하는 중 오류가 발생했습니다.');
        }
    });
    
    // 알림 수 체크 및 배지 업데이트 함수
    function checkNotifications() {
        // 로그인 상태가 아니면 실행하지 않음
        if (!document.getElementById('logoutBtn')) {
            return;
        }
        
        fetch('/api/notifications')
            .then(response => {
                if (!response.ok) {
                    throw new Error('알림 조회 실패');
                }
                return response.json();
            })
            .then(notifications => {
                // 읽지 않은 알림 수 계산
                const unreadCount = notifications.filter(n => !n.read).length;
                
                const notificationBtn = document.getElementById('notificationBtn');
                const existingBadge = document.querySelector('.notification-badge');
                
                // 배지 업데이트 또는 생성
                if (unreadCount > 0) {
                    if (existingBadge) {
                        existingBadge.textContent = unreadCount;
                    } else {
                        const badge = document.createElement('span');
                        badge.classList.add('notification-badge');
                        badge.textContent = unreadCount;
                        notificationBtn.appendChild(badge);
                        notificationBtn.classList.add('has-new-notifications');
                    }
                } else {
                    // 읽지 않은 알림이 없으면 배지 제거
                    if (existingBadge) {
                        existingBadge.remove();
                        notificationBtn.classList.remove('has-new-notifications');
                    }
                }
            })
            .catch(error => {
                console.error('알림 확인 오류:', error);
            });
    }
    
    // 로그아웃 버튼에 확인 대화상자 추가
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            if (!confirm('로그아웃 하시겠습니까?')) {
                e.preventDefault();
            }
        });
    }
    
    // 알림 확인 및 주기적 업데이트
    checkNotifications();
    // 30초마다 알림 확인
    setInterval(checkNotifications, 30000);
});