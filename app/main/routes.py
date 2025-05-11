# app/main/routes.py
from flask import render_template, redirect, url_for, request, session, jsonify
from app.main import main
from app.models import User, Todo, Category
from app.extensions import db
from app.utils import login_required
from datetime import datetime

@main.route('/')
def index():
    """루트 경로를 todo 페이지로 리다이렉트"""
    return redirect(url_for('main.todo'))

@main.route('/todo')
def todo():
    """ToDo 메인 페이지"""
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('public/main.html', user=user, active_page='main')

@main.route('/mypage')
@login_required
def mypage():
    """마이페이지"""
    user = User.query.get(session['user_id'])
    return render_template('public/mypage.html', user=user, active_page='mypage')

@main.route('/settings')
@login_required
def settings():
    """설정 페이지"""
    user = User.query.get(session['user_id'])
    return render_template('public/settings.html', user=user, active_page='mypage')

# Todo API 엔드포인트
@main.route('/api/todos', methods=['GET'])
def get_todos():
    """할 일 목록 반환"""
    user_id = session.get('user_id', 1)
    
    # 쿼리 파라미터 확인
    date = request.args.get('date')
    category_id = request.args.get('category_id')
    include_pinned = request.args.get('include_pinned', 'true').lower() == 'true'
    
    # 기본 쿼리
    query = Todo.query.filter_by(user_id=user_id)
    
    # 날짜별 필터링
    if date:
        # 날짜에 해당하는 항목과 고정된(pinned) 항목 포함
        if include_pinned:
            query = query.filter((Todo.date == date) | (Todo.pinned == True))
        else:
            query = query.filter_by(date=date)
    
    # 카테고리별 필터링
    if category_id:
        query = query.filter_by(category_id=category_id)
    
    todos = query.all()
    result = [todo.to_dict() for todo in todos]
    
    return jsonify(result)

@main.route('/api/todos', methods=['POST'])
def add_todo():
    """할 일 추가"""
    data = request.json
    user_id = session.get('user_id', 1)
    
    # Todo 객체 생성
    todo = Todo.from_dict(data, user_id)
    
    db.session.add(todo)
    db.session.commit()
    
    return jsonify(todo.to_dict())

@main.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """할 일 수정"""
    data = request.json
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    # 필드 업데이트
    todo.title = data.get('title', todo.title)
    todo.description = data.get('description', todo.description)
    if 'date' in data:
        todo.date = datetime.strptime(data['date'], '%Y-%m-%d')
    todo.completed = data.get('completed', todo.completed)
    todo.pinned = data.get('pinned', todo.pinned)
    todo.category_id = data.get('category_id', todo.category_id)
    todo.is_public = data.get('is_public', todo.is_public)
    
    db.session.commit()
    
    return jsonify(todo.to_dict())

@main.route('/api/todos/<int:todo_id>/toggle-pin', methods=['POST'])
def toggle_pin(todo_id):
    """할 일 핀 상태 토글"""
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    todo.pinned = not todo.pinned
    db.session.commit()
    
    return jsonify(todo.to_dict())

@main.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """할 일 삭제"""
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    db.session.delete(todo)
    db.session.commit()
    return jsonify({'result': 'success'})

# 카테고리 API 엔드포인트
@main.route('/api/topics', methods=['GET'])
def get_topics():
    """카테고리 목록 반환"""
    user_id = session.get('user_id', 1)
    topics = Category.query.filter_by(user_id=user_id).all()
    result = [topic.to_dict() for topic in topics]
    return jsonify(result)

@main.route('/api/topics', methods=['POST'])
def add_topic():
    """카테고리 추가"""
    data = request.json
    user_id = session.get('user_id', 1)
    
    topic = Category(
        name=data['name'],
        color=data.get('color', '#3498db'),
        user_id=user_id
    )
    db.session.add(topic)
    db.session.commit()
    
    return jsonify(topic.to_dict())

@main.route('/api/topics/<int:topic_id>', methods=['PUT'])
def update_topic(topic_id):
    """카테고리 수정"""
    data = request.json
    category = Category.query.get_or_404(topic_id)
    
    # 권한 확인
    if 'user_id' in session and category.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    category.name = data.get('name', category.name)
    category.color = data.get('color', category.color)
    
    db.session.commit()
    
    return jsonify(category.to_dict())

@main.route('/api/topics/<int:topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    """카테고리 삭제"""
    category = Category.query.get_or_404(topic_id)
    
    # 권한 확인
    if 'user_id' in session and category.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    # 해당 카테고리에 속한 할 일들의 카테고리 ID를 null로 설정
    Todo.query.filter_by(category_id=topic_id).update({'category_id': None})
    db.session.delete(category)
    db.session.commit()
    return jsonify({'result': 'success'})