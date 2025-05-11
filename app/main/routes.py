# app/main/routes.py
from flask import render_template, redirect, url_for, request, session
from flask_login import current_user, login_required
from app.main import main
from app.models import User, Category
from app.extensions import db

@main.route('/')
def index():
    """루트 경로를 todo 페이지로 리다이렉트"""
    return redirect(url_for('main.todo'))

@main.route('/todo')
def todo():
    """ToDo 메인 페이지"""
    # 카테고리 생성 처리 (GET 파라미터로 온 경우)
    category_name = request.args.get('categoryName')
    category_color = request.args.get('categoryColor')
    
    if category_name and category_color:
        # 사용자 ID 가져오기
        if current_user.is_authenticated:
            user_id = current_user.id
        else:
            user_id = session.get('user_id')
            
        if user_id:
            # 카테고리 생성
            category = Category(
                name=category_name,
                color=category_color,
                user_id=user_id
            )
            db.session.add(category)
            db.session.commit()
            
            # 쿼리 파라미터 없이 리다이렉트
            return redirect(url_for('main.todo'))
    
    # 템플릿 렌더링
    return render_template('public/main.html', 
                          user=current_user if current_user.is_authenticated else None,
                          active_page='main')

@main.route('/mypage')
@login_required
def mypage():
    """마이페이지"""
    return render_template('public/mypage.html', 
                          user=current_user,
                          active_page='mypage')

@main.route('/settings')
@login_required
def settings():
    """설정 페이지"""
    return render_template('public/settings.html', 
                          user=current_user,
                          active_page='mypage')