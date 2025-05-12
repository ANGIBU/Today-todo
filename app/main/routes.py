# app/main/routes.py
from flask import render_template, redirect, url_for, request, session, flash
from flask_login import current_user
from app.main import main
from app.models import Category
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
        try:
            # 사용자 ID (로그인 여부에 따라)
            user_id = current_user.id if current_user.is_authenticated else 1
            
            # 카테고리 생성
            category = Category(
                name=category_name,
                color=category_color,
                user_id=user_id
            )
            db.session.add(category)
            db.session.commit()
            
            flash('카테고리가 생성되었습니다.', 'success')
        except Exception as e:
            db.session.rollback()
            flash(f'카테고리 생성 중 오류가 발생했습니다: {str(e)}', 'error')
        
        # 쿼리 파라미터 없이 리다이렉트
        return redirect(url_for('main.todo'))
    
    # 템플릿 렌더링
    return render_template('public/main.html', 
                          user=current_user if current_user.is_authenticated else None,
                          active_page='main')

@main.route('/mypage')
def mypage():
    """마이페이지"""
    if not current_user.is_authenticated:
        flash('로그인이 필요합니다.', 'error')
        return redirect(url_for('auth.auth_page'))
    
    return render_template('public/mypage.html', 
                          user=current_user,
                          active_page='mypage')

@main.route('/settings')
def settings():
    """설정 페이지"""
    if not current_user.is_authenticated:
        flash('로그인이 필요합니다.', 'error')
        return redirect(url_for('auth.auth_page'))
    
    return render_template('public/settings.html', 
                          user=current_user,
                          active_page='mypage')