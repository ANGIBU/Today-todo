// app/static/js/auth.js
document.addEventListener('DOMContentLoaded', function() {
    // 폼 유효성 검사 기능
    const authForms = document.querySelectorAll('.auth-form form');
    
    authForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            // 유저네임 검사
            const usernameInput = form.querySelector('#username');
            if (usernameInput && usernameInput.value.trim() === '') {
                e.preventDefault();
                showValidationError(usernameInput, '아이디를 입력해주세요.');
                return;
            }
            
            // 비밀번호 검사
            const passwordInput = form.querySelector('#password');
            if (passwordInput && passwordInput.value.trim() === '') {
                e.preventDefault();
                showValidationError(passwordInput, '비밀번호를 입력해주세요.');
                return;
            }
            
            // 회원가입 폼일 경우 추가 검사
            if (form.action.includes('register')) {
                // 이메일 검사
                const emailInput = form.querySelector('#email');
                if (emailInput) {
                    if (emailInput.value.trim() === '') {
                        e.preventDefault();
                        showValidationError(emailInput, '이메일을 입력해주세요.');
                        return;
                    }
                    
                    // 이메일 형식 검사
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(emailInput.value)) {
                        e.preventDefault();
                        showValidationError(emailInput, '올바른 이메일 형식이 아닙니다.');
                        return;
                    }
                }
                
                // 닉네임 검사
                const nicknameInput = form.querySelector('#nickname');
                if (nicknameInput && nicknameInput.value.trim() === '') {
                    e.preventDefault();
                    showValidationError(nicknameInput, '닉네임을 입력해주세요.');
                    return;
                }
                
                // 비밀번호 길이 검사
                if (passwordInput && passwordInput.value.length < 6) {
                    e.preventDefault();
                    showValidationError(passwordInput, '비밀번호는 최소 6자 이상이어야 합니다.');
                    return;
                }
            }
        });
    });
    
    // 입력 필드에 포커스가 갈 때 에러 메시지 제거
    const inputFields = document.querySelectorAll('input');
    inputFields.forEach(input => {
        input.addEventListener('focus', function() {
            // 이전 에러 메시지 제거
            const errorElement = input.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.remove();
            }
            
            // 에러 스타일 제거
            input.classList.remove('error');
        });
    });
    
    // 유효성 검사 에러 표시 함수
    function showValidationError(inputElement, message) {
        // 이전 에러 메시지 제거
        const existingError = inputElement.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // 입력 필드에 에러 스타일 추가
        inputElement.classList.add('error');
        
        // 에러 메시지 요소 생성
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // 에러 메시지 삽입
        inputElement.parentElement.appendChild(errorElement);
        
        // 입력 필드에 포커스
        inputElement.focus();
    }
    
    // 플래시 메시지 자동 사라짐 기능
    const flashMessages = document.querySelectorAll('.flash-message');
    if (flashMessages.length > 0) {
        setTimeout(() => {
            flashMessages.forEach(message => {
                message.style.opacity = '0';
                setTimeout(() => {
                    message.remove();
                }, 300);
            });
        }, 5000);
    }
});