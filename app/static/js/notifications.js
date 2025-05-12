// static/js/notifications.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationsSidebar = document.getElementById('notificationsSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const notificationsList = document.getElementById('notificationsList');
    const emptyNotifications = document.getElementById('emptyNotifications');
    const clearAllBtn = document.getElementById('clearAllBtn');
    
    // 웹 알림 권한 확인
    let notificationPermission = Notification.permission;
    
    // 알림 사이드바 토글
    function toggleSidebar() {
        notificationsSidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('show');
        
        // 알림 사이드바가 열리면 알림 목록 확인
        if (notificationsSidebar.classList.contains('open')) {
            checkNotifications();
        }
    }
    
    // 알림 사이드바 닫기
    function closeSidebar() {
        notificationsSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    }
    
    // 알림 목록 아이템 생성
    function createNotificationItem(notification) {
        // 알림 아이템 생성
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        item.dataset.id = notification.id;
        
        // 프로필 이미지 (보낸 사람이 있는 경우)
        let senderImage = '';
        if (notification.sender && notification.sender.profile_image) {
            senderImage = `
                <div class="notification-sender-img">
                    <img src="/static/uploads/${notification.sender.profile_image}" alt="Profile">
                </div>
            `;
        } else {
            senderImage = `
                <div class="notification-sender-img default">
                    <i class="fas fa-bell"></i>
                </div>
            `;
        }
        
        // 알림 타입에 따른 아이콘
        let typeIcon = '';
        switch(notification.type) {
            case 'follow':
                typeIcon = '<i class="fas fa-user-plus"></i>';
                break;
            case 'like':
                typeIcon = '<i class="fas fa-heart"></i>';
                break;
            case 'mention':
                typeIcon = '<i class="fas fa-at"></i>';
                break;
            case 'comment':
                typeIcon = '<i class="fas fa-comment"></i>';
                break;
            default:
                typeIcon = '<i class="fas fa-bell"></i>';
        }
        
        // 알림 아이템 HTML
        item.innerHTML = `
            ${senderImage}
            <div class="notification-content">
                <div class="notification-icon">${typeIcon}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notification.created_at}</div>
            </div>
            <button class="read-btn" data-id="${notification.id}" title="읽음으로 표시">
                <i class="fas ${notification.read ? 'fa-check-circle' : 'fa-circle'}"></i>
            </button>
        `;
        
        return item;
    }
    
    // 알림 목록 확인 및 표시
    async function checkNotifications() {
        try {
            // 로그인 여부 확인
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            
            // 로딩 표시
            notificationsList.innerHTML = `
                <div class="loading-indicator">
                    <i class="fas fa-spinner fa-pulse"></i>
                    <span>로딩 중...</span>
                </div>
            `;
            
            // 비로그인 사용자는 에러 처리 없이 빈 배열 반환
            if (!isLoggedIn) {
                // 알림 없음 표시
                notificationsList.innerHTML = '';
                emptyNotifications.style.display = 'block';
                return;
            }
            
            try {
                // API로 알림 목록 요청
                const response = await fetch('/api/notifications');
                
                // 404 등 오류 응답은 빈 배열로 처리, 오류 로그는 콘솔에만 출력
                if (!response.ok) {
                    console.warn(`알림 API 응답 오류: ${response.status} ${response.statusText}`);
                    notificationsList.innerHTML = '';
                    emptyNotifications.style.display = 'block';
                    return;
                }
                
                const notifications = await response.json();
                
                // 알림 목록 업데이트
                notificationsList.innerHTML = '';
                
                if (notifications.length === 0) {
                    // 알림이 없는 경우
                    emptyNotifications.style.display = 'block';
                } else {
                    // 알림이 있는 경우
                    emptyNotifications.style.display = 'none';
                    
                    // 알림 아이템 추가
                    notifications.forEach(notification => {
                        const item = createNotificationItem(notification);
                        notificationsList.appendChild(item);
                    });
                    
                    // 읽음 표시 버튼 이벤트 등록
                    const readBtns = document.querySelectorAll('.read-btn');
                    readBtns.forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const notificationId = btn.dataset.id;
                            markAsRead(notificationId);
                        });
                    });
                }
            } catch (error) {
                console.warn('알림 확인 오류:', error);
                // 오류 발생 시 빈 목록 표시
                notificationsList.innerHTML = '';
                emptyNotifications.style.display = 'block';
            }
        } catch (error) {
            console.warn('알림 처리 중 오류:', error);
        }
    }
    
    // 알림을 읽음으로 표시
    async function markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // UI 업데이트
                const notificationItem = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
                if (notificationItem) {
                    notificationItem.classList.remove('unread');
                    notificationItem.classList.add('read');
                    
                    const readBtn = notificationItem.querySelector('.read-btn i');
                    if (readBtn) {
                        readBtn.classList.remove('fa-circle');
                        readBtn.classList.add('fa-check-circle');
                    }
                }
                
                // 읽지 않은 알림 개수 업데이트
                updateUnreadCount();
            }
        } catch (error) {
            console.warn('알림 읽음 표시 중 오류:', error);
        }
    }
    
    // 모든 알림 읽음으로 표시
    async function markAllAsRead() {
        try {
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            if (!isLoggedIn) return;
            
            const response = await fetch('/api/notifications/read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // UI 업데이트
                const unreadItems = document.querySelectorAll('.notification-item.unread');
                unreadItems.forEach(item => {
                    item.classList.remove('unread');
                    item.classList.add('read');
                    
                    const readBtn = item.querySelector('.read-btn i');
                    if (readBtn) {
                        readBtn.classList.remove('fa-circle');
                        readBtn.classList.add('fa-check-circle');
                    }
                });
                
                // 읽지 않은 알림 개수 업데이트
                updateUnreadCount(0);
            }
        } catch (error) {
            console.warn('모든 알림 읽음 표시 중 오류:', error);
        }
    }
    
    // 모든 알림 삭제
    async function clearAllNotifications() {
        try {
            const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
            if (!isLoggedIn) return;
            
            if (!confirm('모든 알림을 삭제하시겠습니까?')) {
                return;
            }
            
            const response = await fetch('/api/notifications/clear', {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // UI 업데이트
                notificationsList.innerHTML = '';
                emptyNotifications.style.display = 'block';
                
                // 읽지 않은 알림 개수 업데이트
                updateUnreadCount(0);
            }
        } catch (error) {
            console.warn('알림 삭제 중 오류:', error);
        }
    }
    
    // 읽지 않은 알림 개수 업데이트
    function updateUnreadCount(count) {
        // 알림 아이콘에 뱃지 표시
        const notificationBadge = document.querySelector('.notification-badge');
        
        if (typeof count === 'undefined') {
            // count가 없는 경우 직접 계산
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            count = unreadItems.length;
        }
        
        if (count > 0) {
            // 뱃지가 없으면 생성
            if (!notificationBadge) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = count > 9 ? '9+' : count;
                notificationBtn.appendChild(badge);
            } else {
                notificationBadge.textContent = count > 9 ? '9+' : count;
                notificationBadge.style.display = 'block';
            }
        } else {
            // 읽지 않은 알림이 없으면 뱃지 숨김
            if (notificationBadge) {
                notificationBadge.style.display = 'none';
            }
        }
    }
    
    // 웹 알림 권한 요청
    function requestNotificationPermission() {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                notificationPermission = permission;
            });
        }
    }
    
    // 이벤트 리스너 등록
    if (notificationBtn) {
        notificationBtn.addEventListener('click', toggleSidebar);
    }
    
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', closeSidebar);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeSidebar);
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotifications);
    }
    
    // 페이지 로드 시 읽지 않은 알림 개수 확인
    const isLoggedIn = document.body.getAttribute('data-logged-in') === 'true';
    if (isLoggedIn) {
        setInterval(checkNotifications, 60000); // 1분마다 알림 확인
    }
    
    // 웹 알림 권한 요청
    requestNotificationPermission();
});