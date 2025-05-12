# app/main/routes.py
from flask import render_template, redirect, url_for, session, request, flash, jsonify
from flask_login import login_required, current_user
from app.main import main
from app.models import User, Todo, Category
from app.extensions import db
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

@main.route('/')
def index():
    """메인 페이지"""
    return redirect(url_for('main.todo'))

@main.route('/todo')
def todo():
    """할 일 관리 페이지"""
    # 카테고리 파라미터가 있는 경우 처리 (새 카테고리 생성)
    category_name = request.args.get('categoryName')
    category_color = request.args.get('categoryColor')
    
    if category_name and category_color:
        try:
            # 사용자 ID (로그인 여부에 따라)
            user_id = current_user.id if current_user.is_authenticated else session.get('user_id', 1)
            
            # 카테고리 생성
            category = Category(
                name=category_name,
                color=category_color,
                user_id=user_id
            )
            
            db.session.add(category)
            db.session.commit()
            
            logger.info(f"카테고리 생성 성공: {category_name}, 사용자 ID: {user_id}")
            flash('카테고리가 생성되었습니다.', 'success')
        except Exception as e:
            logger.error(f"카테고리 생성 중 오류: {str(e)}")
            db.session.rollback()
            flash('카테고리 생성 중 오류가 발생했습니다.', 'error')
                
        return redirect(url_for('main.todo'))
    
    # 로그인한 사용자 정보
    user = current_user if current_user.is_authenticated else None
    
    active_page = 'main'  # 현재 활성 탭
    return render_template('public/main.html', active_page=active_page, user=user)

@main.route('/mypage')
@login_required
def mypage():
    """마이페이지"""
    logger.info(f"마이페이지 접근: 사용자 ID={current_user.id}, 인증 상태={current_user.is_authenticated}")
    
    if session.get('user_id') != current_user.id:
        logger.warning(f"세션 사용자 ID({session.get('user_id')})와 현재 사용자 ID({current_user.id})가 일치하지 않음")
        session['user_id'] = current_user.id
    
    # 모든 할 일 및 완료된 할 일 개수 계산
    todos = Todo.query.filter_by(user_id=current_user.id).all()
    completed_todos = sum(1 for todo in todos if todo.completed)
    
    # 팔로잉/팔로워 수 계산
    following_count = current_user.followed.count()
    followers_count = current_user.followers.count()
    
    active_page = 'mypage'  # 현재 활성 탭
    return render_template('public/mypage.html', 
                          active_page=active_page,
                          todos_count=len(todos),
                          completed_count=completed_todos,
                          following_count=following_count,
                          followers_count=followers_count,
                          user=current_user)

@main.route('/settings')
@login_required
def settings():
    """설정 페이지"""
    logger.info(f"설정 페이지 접근: 사용자 ID={current_user.id}")
    
    active_page = 'mypage'  # 현재 활성 탭 (마이페이지 하위 메뉴)
    return render_template('public/settings.html', active_page=active_page, user=current_user)

@main.route('/api/user/todos/stats')
@login_required
def get_todo_stats():
    """사용자의 할 일 통계 정보"""
    try:
        # 모든 할 일 및 완료된 할 일 개수 계산
        todos = Todo.query.filter_by(user_id=current_user.id).all()
        completed_todos = sum(1 for todo in todos if todo.completed)
        
        # 카테고리별 할 일 수 계산
        category_stats = {}
        for todo in todos:
            category_id = todo.category_id
            category_name = '카테고리 없음'
            
            if category_id:
                category = Category.query.get(category_id)
                if category:
                    category_name = category.name
            
            if category_name not in category_stats:
                category_stats[category_name] = {'total': 0, 'completed': 0}
            
            category_stats[category_name]['total'] += 1
            if todo.completed:
                category_stats[category_name]['completed'] += 1
        
        stats = {
            'total_todos': len(todos),
            'completed_todos': completed_todos,
            'completion_rate': round(completed_todos / len(todos) * 100, 1) if todos else 0,
            'category_stats': category_stats
        }
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"통계 조회 중 오류: {str(e)}")
        return jsonify({'error': '통계 조회 중 오류가 발생했습니다.'}), 500