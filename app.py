# today_todo/app.py
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from datetime import datetime
import os
import json
from extensions import db
from models import User, Todo, Category, Notification
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.config['SERVER_NAME'] = 'today-todo.smartlivon.com'  # 도메인 이름 설정
app.config['SECRET_KEY'] = 'todo_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# DB 초기화
db.init_app(app)

# 데이터베이스 초기화
with app.app_context():
    db.create_all()
    
    # 기본 사용자 생성
    if not User.query.first():
        default_user = User(username='default_user', email='default@example.com', nickname='기본 사용자')
        default_user.set_password('password123')
        db.session.add(default_user)
        db.session.commit()
    
    # 기본 카테고리는 모두 삭제함

# 라우트 정의
@app.route('/')
def main():
    return render_template('public/main.html')

# 둘러보기 페이지 (커뮤니티 페이지)
@app.route('/explore')
def explore():
    return render_template('public/explore.html')

# 알림 페이지
@app.route('/notifications')
def notifications():
    return render_template('public/notifications.html')

# 마이페이지
@app.route('/mypage')
def mypage():
    return render_template('public/mypage.html')

# 인증 관련 라우트
@app.route('/auth', methods=['GET', 'POST'])
def auth():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['nickname'] = user.nickname
            return redirect(url_for('main'))
        
        flash('아이디 또는 비밀번호가 잘못되었습니다.')
    
    return render_template('public/auth.html', action='login')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        nickname = request.form.get('nickname')
        
        if User.query.filter_by(username=username).first():
            flash('이미 존재하는 아이디입니다.')
            return render_template('public/auth.html', action='register')
        
        if User.query.filter_by(email=email).first():
            flash('이미 존재하는 이메일입니다.')
            return render_template('public/auth.html', action='register')
        
        user = User(username=username, email=email, nickname=nickname)
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        flash('회원가입이 완료되었습니다. 로그인해주세요.')
        return redirect(url_for('login'))
    
    return render_template('public/auth.html', action='register')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('nickname', None)
    return redirect(url_for('main'))

# API 엔드포인트
@app.route('/api/todos', methods=['GET'])
def get_todos():
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
    result = []
    for todo in todos:
        result.append({
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'date': todo.date.strftime('%Y-%m-%d'),
            'completed': todo.completed,
            'pinned': todo.pinned,
            'category_id': todo.category_id,
            'is_public': todo.is_public
        })
    return jsonify(result)

@app.route('/api/todos', methods=['POST'])
def add_todo():
    data = request.json
    user_id = session.get('user_id', 1)
    
    todo = Todo(
        title=data['title'],
        description=data.get('description', ''),
        date=datetime.strptime(data['date'], '%Y-%m-%d'),
        category_id=data.get('category_id'),
        pinned=data.get('pinned', False),
        is_public=data.get('is_public', False),
        user_id=user_id
    )
    db.session.add(todo)
    db.session.commit()
    
    return jsonify({
        'id': todo.id,
        'title': todo.title,
        'description': todo.description,
        'date': todo.date.strftime('%Y-%m-%d'),
        'completed': todo.completed,
        'pinned': todo.pinned,
        'category_id': todo.category_id,
        'is_public': todo.is_public
    })

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    data = request.json
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인 (로그인된 경우만)
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    todo.title = data.get('title', todo.title)
    todo.description = data.get('description', todo.description)
    if 'date' in data:
        todo.date = datetime.strptime(data['date'], '%Y-%m-%d')
    todo.completed = data.get('completed', todo.completed)
    todo.pinned = data.get('pinned', todo.pinned)
    todo.category_id = data.get('category_id', todo.category_id)
    todo.is_public = data.get('is_public', todo.is_public)
    
    db.session.commit()
    
    return jsonify({
        'id': todo.id,
        'title': todo.title,
        'description': todo.description,
        'date': todo.date.strftime('%Y-%m-%d'),
        'completed': todo.completed,
        'pinned': todo.pinned,
        'category_id': todo.category_id,
        'is_public': todo.is_public
    })

@app.route('/api/todos/<int:todo_id>/toggle-pin', methods=['POST'])
def toggle_pin(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인 (로그인된 경우만)
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    todo.pinned = not todo.pinned
    db.session.commit()
    
    return jsonify({
        'id': todo.id,
        'title': todo.title,
        'description': todo.description,
        'date': todo.date.strftime('%Y-%m-%d'),
        'completed': todo.completed,
        'pinned': todo.pinned,
        'category_id': todo.category_id,
        'is_public': todo.is_public
    })

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todo = Todo.query.get_or_404(todo_id)
    
    # 권한 확인 (로그인된 경우만)
    if 'user_id' in session and todo.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    db.session.delete(todo)
    db.session.commit()
    return jsonify({'result': 'success'})

@app.route('/api/topics', methods=['GET'])
def get_topics():
    user_id = session.get('user_id', 1)
    topics = Category.query.filter_by(user_id=user_id).all()
    result = []
    for topic in topics:
        result.append({
            'id': topic.id,
            'name': topic.name,
            'color': topic.color
        })
    return jsonify(result)

@app.route('/api/topics', methods=['POST'])
def add_topic():
    data = request.json
    user_id = session.get('user_id', 1)
    
    topic = Category(
        name=data['name'],
        color=data.get('color', '#3498db'),
        user_id=user_id
    )
    db.session.add(topic)
    db.session.commit()
    
    return jsonify({
        'id': topic.id,
        'name': topic.name,
        'color': topic.color
    })

@app.route('/api/topics/<int:topic_id>', methods=['PUT'])
def update_topic(topic_id):
    data = request.json
    category = Category.query.get_or_404(topic_id)
    
    # 권한 확인 (로그인된 경우만)
    if 'user_id' in session and category.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    category.name = data.get('name', category.name)
    category.color = data.get('color', category.color)
    
    db.session.commit()
    
    return jsonify({
        'id': category.id,
        'name': category.name,
        'color': category.color
    })

@app.route('/api/topics/<int:topic_id>', methods=['DELETE'])
def delete_topic(topic_id):
    category = Category.query.get_or_404(topic_id)
    
    # 권한 확인 (로그인된 경우만)
    if 'user_id' in session and category.user_id != session.get('user_id'):
        return jsonify({'error': '권한이 없습니다.'}), 403
    
    # 해당 카테고리에 속한 할 일들의 카테고리 ID를 null로 설정
    Todo.query.filter_by(category_id=topic_id).update({'category_id': None})
    db.session.delete(category)
    db.session.commit()
    return jsonify({'result': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=False)