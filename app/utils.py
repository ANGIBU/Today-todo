# app/utils.py
from app.extensions import db
from app.models import User, Category
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app

def create_default_user():
    """기본 사용자가 없으면 생성"""
    if not User.query.first():
        default_user = User(
            username='default_user', 
            email='default@example.com', 
            nickname='기본 사용자'
        )
        default_user.set_password('password123')
        
        # 기본 카테고리 추가
        categories = [
            {'name': '업무', 'color': '#3498db'},
            {'name': '개인', 'color': '#2ecc71'},
            {'name': '중요', 'color': '#e74c3c'}
        ]
        
        db.session.add(default_user)
        db.session.commit()
        
        for cat_data in categories:
            category = Category(
                name=cat_data['name'],
                color=cat_data['color'],
                user_id=default_user.id
            )
            db.session.add(category)
        
        db.session.commit()

def login_required(f):
    """로그인 필요 데코레이터"""
    from flask import redirect, url_for, session, flash
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('로그인이 필요한 서비스입니다.')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    """허용된 파일 확장자인지 확인"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_file(file, folder='profiles'):
    """파일 저장 및 파일명 반환"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # 파일명 중복 방지
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        
        # 폴더 경로 설정
        folder_path = os.path.join(current_app.config['UPLOAD_FOLDER'], folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # 파일 저장
        file_path = os.path.join(folder_path, unique_filename)
        file.save(file_path)
        
        return unique_filename
    return None

def create_notification(user_id, message, notification_type, sender_id=None):
    """알림 생성 유틸리티 함수"""
    from app.models import Notification
    
    notification = Notification(
        user_id=user_id,
        message=message,
        type=notification_type,
        sender_id=sender_id
    )
    
    db.session.add(notification)
    db.session.commit()
    
    return notification