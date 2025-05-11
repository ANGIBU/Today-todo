// static/js/diary.js
document.addEventListener('DOMContentLoaded', function() {
    const diaryEditor = document.getElementById('diaryEditor');
    const saveDiaryBtn = document.getElementById('saveDiary');
    const toolbarButtons = document.querySelectorAll('.toolbar-btn:not(.color-btn)');
    const colorBtn = document.querySelector('.color-btn');
    const colorPicker = document.getElementById('colorPicker');
    const colorOptions = document.querySelectorAll('.color-option');
    const fontSelect = document.getElementById('fontSelect');
    const fontSize = document.getElementById('fontSize');
    const imageUpload = document.getElementById('imageUpload');
    const autoSaveIndicator = document.querySelector('.auto-save-indicator');
    
    // 자동 저장 타이머
    let autoSaveTimer = null;
    // 자동 저장 간격 (밀리초)
    const autoSaveInterval = 10000; // 10초
    
    // 기본 포커스 설정
    diaryEditor.focus();
    
    // 현재 선택된 색상을 추적하는 변수
    let currentSelectedColor = null;

    // 서식 툴바 버튼 이벤트
    toolbarButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const command = this.dataset.command;
            
            if (command === 'insertImage') {
                imageUpload.click();
            } else {
                document.execCommand(command, false, null);
            }
            
            diaryEditor.focus();
            startAutoSaveTimer();
        });
    });
    
    // 색상 선택 버튼 클릭 이벤트
    colorBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation(); // 이벤트 전파 중지
        
        // 색상 선택기 토글
        if (colorPicker.style.display === 'none' || colorPicker.style.display === '') {
            colorPicker.style.display = 'block';
            
            // 현재 텍스트 색상 찾기 및 해당 색상 옵션 강조
            updateSelectedColorInPicker();
        } else {
            colorPicker.style.display = 'none';
        }
    });
    
    // 선택된 텍스트의 색상을 찾아 선택기에 표시
    function updateSelectedColorInPicker() {
        // 모든 색상 옵션에서 selected 클래스 제거
        colorOptions.forEach(option => option.classList.remove('selected'));
        
        // 현재 선택된 텍스트의 색상 가져오기
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (!range.collapsed) {
                // 선택된 텍스트가 있는 경우
                const color = document.queryCommandValue('foreColor');
                if (color) {
                    // RGB 색상을 HEX로 변환
                    const hexColor = rgbToHex(color);
                    
                    // 해당 색상 옵션에 selected 클래스 추가
                    colorOptions.forEach(option => {
                        if (option.dataset.color.toLowerCase() === hexColor?.toLowerCase()) {
                            option.classList.add('selected');
                            currentSelectedColor = option.dataset.color;
                        }
                    });
                }
            }
        }
    }
    
    // RGB 색상을 HEX로 변환하는 함수
    function rgbToHex(rgb) {
        if (/^#/.test(rgb)) return rgb; // 이미 HEX 형식이면 그대로 반환
        
        // RGB 값 추출
        let rgbArray = rgb.match(/\d+/g);
        if (!rgbArray || rgbArray.length !== 3) return null;
        
        let hex = '#';
        rgbArray.forEach(value => {
            let hexValue = parseInt(value).toString(16);
            hex += hexValue.length === 1 ? '0' + hexValue : hexValue;
        });
        
        return hex;
    }
    
    // 색상 선택 이벤트 - 선택된 텍스트에 색상 적용
    colorOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // 이벤트 전파 중지
            
            const color = this.dataset.color;
            
            // 다른 옵션에서 selected 클래스 제거하고 현재 옵션에 추가
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            currentSelectedColor = color;
            
            // 선택 범위 확인
            const selection = window.getSelection();
            const hasSelection = selection.toString().length > 0;
            
            if (hasSelection) {
                // 선택된 텍스트에 색상 적용
                document.execCommand('foreColor', false, color);
            } else {
                // 선택 범위가 없는 경우, 현재 캐럿 위치에 색상 적용 준비
                document.execCommand('foreColor', false, color);
            }
            
            // 색상 선택기 닫기
            colorPicker.style.display = 'none';
            
            // 에디터에 포커스
            diaryEditor.focus();
            
            // 변경 후 자동 저장
            startAutoSaveTimer();
        });
    });
    
    // 현재 선택 또는 캐럿 위치 저장 함수
    function saveSelection() {
        if (window.getSelection) {
            const sel = window.getSelection();
            if (sel.getRangeAt && sel.rangeCount) {
                return sel.getRangeAt(0);
            }
        }
        return null;
    }
    
    // 폰트 선택 이벤트
    fontSelect.addEventListener('change', function() {
        document.execCommand('fontName', false, this.value);
        diaryEditor.focus();
        startAutoSaveTimer();
    });
    
    // 폰트 크기 이벤트
    fontSize.addEventListener('change', function() {
        document.execCommand('fontSize', false, this.value);
        diaryEditor.focus();
        startAutoSaveTimer();
    });
    
    // 이미지 업로드 이벤트
    imageUpload.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'diary-image';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                
                // 이미지 삽입 전 선택 저장
                const currentRange = saveSelection();
                
                // 에디터에 포커스
                diaryEditor.focus();
                
                // 현재 위치에 이미지 삽입
                if (currentRange) {
                    // 선택 복원 및 이미지 삽입
                    restoreSelection(currentRange);
                    document.execCommand('insertHTML', false, img.outerHTML);
                } else {
                    // 선택 영역이 없으면 에디터 끝에 추가
                    diaryEditor.appendChild(img);
                }
                
                // 이미지 삽입 후 자동 저장
                startAutoSaveTimer();
            };
            
            reader.readAsDataURL(this.files[0]);
        }
        
        // 파일 입력 초기화
        this.value = '';
    });
    
    // 저장된 선택 또는 캐럿 위치 복원 함수
    function restoreSelection(range) {
        if (range) {
            if (window.getSelection) {
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }
    
    // 외부 클릭 시 색상 선택기 닫기
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.color-btn-wrapper')) {
            if (colorPicker.style.display === 'block') {
                colorPicker.style.display = 'none';
            }
        }
    });
    
    // 자동 저장 타이머 시작
    function startAutoSaveTimer() {
        // 기존 타이머 취소
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        
        // 새로운 타이머 설정
        autoSaveTimer = setTimeout(function() {
            saveDiaryContent(true);
        }, autoSaveInterval);
    }
    
    // 일기 내용 저장
    function saveDiaryContent(isAutoSave = false) {
        const date = window.todoApp?.formatSelectedDate() || new Date().toISOString().split('T')[0];
        localStorage.setItem('diary_' + date, diaryEditor.innerHTML);
        
        if (isAutoSave) {
            // 자동 저장 표시
            autoSaveIndicator.classList.add('visible');
            
            // 3초 후 알림 숨기기
            setTimeout(() => {
                autoSaveIndicator.classList.remove('visible');
            }, 3000);
        } else {
            // 수동 저장 메시지 표시
            const saveMsg = document.createElement('div');
            saveMsg.className = 'save-message';
            saveMsg.textContent = '저장되었습니다!';
            
            const diaryFooter = document.querySelector('.diary-footer');
            diaryFooter.appendChild(saveMsg);
            
            // 2초 후 메시지 제거
            setTimeout(() => {
                saveMsg.remove();
            }, 2000);
        }
    }
    
    // 에디터 내용 변경 감지
    diaryEditor.addEventListener('input', function() {
        startAutoSaveTimer();
    });
    
    // 키 입력 감지
    diaryEditor.addEventListener('keydown', function(e) {
        // 특수 키는 무시 (화살표, 탭 등)
        if (e.key.length > 1 && !e.ctrlKey && !e.metaKey) return;
        
        // Ctrl+키 조합은 처리하지 않음
        if (e.ctrlKey || e.metaKey) return;
        
        // 자동 저장 타이머 시작
        startAutoSaveTimer();
        
        // 현재 선택된 색상이 있고, 선택 영역이 없을 때 색상 적용
        if (currentSelectedColor && window.getSelection().toString() === '') {
            // 일부 특수 키는 무시
            if (['Enter', 'Backspace', 'Delete', 'Tab', 'Escape'].includes(e.key)) return;
            
            // 현재 선택한 색상 적용
            document.execCommand('foreColor', false, currentSelectedColor);
        }
    });
    
    // 저장된 일기 불러오기
    function loadDiary(date) {
        const savedDiary = localStorage.getItem('diary_' + date);
        if (savedDiary) {
            diaryEditor.innerHTML = savedDiary;
        } else {
            diaryEditor.innerHTML = '';
        }
    }
    
    // 날짜 변경 시 일기 불러오기
    document.addEventListener('dateChanged', function(e) {
        loadDiary(e.detail.date);
    });
    
    // 초기 일기 로드
    loadDiary(window.todoApp?.formatSelectedDate() || new Date().toISOString().split('T')[0]);
    
    // 일기 저장 버튼 클릭
    saveDiaryBtn.addEventListener('click', function() {
        saveDiaryContent(false);
    });
    
    // placeholder 기능 구현
    diaryEditor.addEventListener('focus', function() {
        if (this.innerHTML === '') {
            this.innerHTML = '';
        }
    });
    
    diaryEditor.addEventListener('blur', function() {
        if (this.innerHTML === '') {
            this.innerHTML = '';
        }
    });

    // ESC 키로 색상 선택기 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && colorPicker.style.display === 'block') {
            colorPicker.style.display = 'none';
            diaryEditor.focus();
        }
    });
});