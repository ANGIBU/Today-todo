# app.py
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from datetime import datetime
import os
import json
from extensions import db
from models import User, Todo, Category, Notification
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'todo_secret_key'
# MySQL에 연결하지 못하므로 SQLite 사용으로 변경
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# DB 초기화
db.init_app(app)

# 로그인 필요 데코레이터
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('로그인이 필요한 서비스입니다.')
            return redirect(url_for('auth'))
        return f(*args, **kwargs)
    return decorated_function

# 데이터베이스 초기화
with app.app_context():
    db.create_all()
    
    # 기본 사용자 생성
    if not User.query.first():
        default_user = User(username='default_user', email='default@example.com', nickname='기본 사용자')
        default_user.set_password('password123')
        db.session.add(default_user)
        db.session.commit()

# 루트 경로를 todo로 리다이렉트
@app.route('/')
def index():
    return redirect(url_for('todo'))

# ToDo 메인 페이지
@app.route('/todo')
def todo():
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('public/main.html', user=user, active_page='main')

# 둘러보기 페이지 (커뮤니티 페이지)
@app.route('/explore')
def explore():
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('public/explore.html', user=user, active_page='explore')

# 마이페이지
@app.route('/mypage')
@login_required
def mypage():
    user = User.query.get(session['user_id'])
    return render_template('public/mypage.html', user=user, active_page='mypage')

# 설정 페이지
@app.route('/settings')
@login_required
def settings():
    user = User.query.get(session['user_id'])
    return render_template('public/settings.html', user=user, active_page='mypage')

# 로그인 페이지
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['nickname'] = user.nickname
            return redirect(url_for('todo'))
        
        flash('아이디 또는 비밀번호가 잘못되었습니다.')
    
    return render_template('public/auth.html', action='login')

# 인증 라우트 - 로그인/가입 선택 페이지
@app.route('/auth')
def auth():
    return render_template('public/auth.html', action='login')

# 회원가입 페이지
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

# 로그아웃
@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('nickname', None)
    flash('로그아웃되었습니다.')
    return redirect(url_for('todo'))

# 할일 API 엔드포인트
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

# 카테고리 API 엔드포인트
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

# 사용자 프로필 API 엔드포인트
@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    user = User.query.get_or_404(user_id)
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'nickname': user.nickname,
        'bio': user.bio,
        'profile_image': user.profile_image,
        'created_at': user.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        'followers_count': user.followers.count(),
        'following_count': user.followed.count()
    })

@app.route('/api/user/profile', methods=['PUT'])
def update_user_profile():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'nickname' in data:
        user.nickname = data['nickname']
    if 'bio' in data:
        user.bio = data['bio']
    
    db.session.commit()
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'nickname': user.nickname,
        'bio': user.bio,
        'profile_image': user.profile_image
    })

# 팔로우 API 엔드포인트
@app.route('/api/users/<int:user_id>/follow', methods=['POST'])
@login_required
def follow_user(user_id):
    current_user_id = session.get('user_id')
    if current_user_id == user_id:
        return jsonify({'error': '자신을 팔로우할 수 없습니다.'}), 400
    
    current_user = User.query.get_or_404(current_user_id)
    user_to_follow = User.query.get_or_404(user_id)
    
    current_user.follow(user_to_follow)
    db.session.commit()
    
    # 알림 생성
    notification = Notification(
        message=f"{current_user.nickname}님이 회원님을 팔로우하기 시작했습니다.",
        type='follow',
        user_id=user_id,
        sender_id=current_user_id
    )
    db.session.add(notification)
    db.session.commit()
    
    return jsonify({'result': 'success'})

@app.route('/api/users/<int:user_id>/unfollow', methods=['POST'])
@login_required
def unfollow_user(user_id):
    current_user_id = session.get('user_id')
    current_user = User.query.get_or_404(current_user_id)
    user_to_unfollow = User.query.get_or_404(user_id)
    
    current_user.unfollow(user_to_unfollow)
    db.session.commit()
    
    return jsonify({'result': 'success'})

# 커뮤니티 API 엔드포인트
@app.route('/api/explore/users', methods=['GET'])
def get_explore_users():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify({'following': [], 'recommended': []}), 200
    
    current_user = User.query.get_or_404(current_user_id)
    
    # 팔로우 중인 사용자
    following_users = current_user.followed.all()
    following_result = []
    for user in following_users:
        following_result.append({
            'id': user.id,
            'username': user.username,
            'nickname': user.nickname,
            'profile_image': user.profile_image
        })
    
    # 추천 사용자 (자신과 이미 팔로우한 사용자 제외)
    following_ids = [user.id for user in following_users]
    following_ids.append(current_user_id)
    recommended_users = User.query.filter(~User.id.in_(following_ids)).limit(10).all()
    
    recommended_result = []
    for user in recommended_users:
        recommended_result.append({
            'id': user.id,
            'username': user.username,
            'nickname': user.nickname,
            'profile_image': user.profile_image,
            'is_following': False
        })
    
    return jsonify({
        'following': following_result,
        'recommended': recommended_result
    })

@app.route('/api/explore/todos', methods=['GET'])
def get_explore_todos():
    current_user_id = session.get('user_id')
    if not current_user_id:
        return jsonify([]), 200
    
    current_user = User.query.get_or_404(current_user_id)
    
    # 팔로우 중인 사용자의 공개 할 일
    followed_todos = current_user.followed_todos().all()
    
    result = []
    for todo in followed_todos:
        user = User.query.get(todo.user_id)
        category = None
        category_color = None
        
        if todo.category_id:
            category_obj = Category.query.get(todo.category_id)
            if category_obj:
                category = category_obj.name
                category_color = category_obj.color
        
        result.append({
            'id': todo.id,
            'title': todo.title,
            'description': todo.description,
            'date': todo.date.strftime('%Y-%m-%d'),
            'completed': todo.completed,
            'category': category,
            'category_color': category_color,
            'created_at': todo.created_at.strftime('%Y-%m-%d %H:%M'),
            'user': {
                'id': user.id,
                'username': user.username,
                'nickname': user.nickname,
                'profile_image': user.profile_image
            }
        })
    
    return jsonify(result)

# 알림 API 엔드포인트
@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    user_id = session.get('user_id')
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    
    result = []
    for notification in notifications:
        sender = None
        if notification.sender_id:
            sender_user = User.query.get(notification.sender_id)
            if sender_user:
                sender = {
                    'id': sender_user.id,
                    'username': sender_user.username,
                    'nickname': sender_user.nickname,
                    'profile_image': sender_user.profile_image
                }
        
        result.append({
            'id': notification.id,
            'message': notification.message,
            'type': notification.type,
            'read': notification.read,
            'created_at': notification.created_at.strftime('%Y-%m-%d %H:%M'),
            'sender': sender
        })
    
    return jsonify(result)

@app.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    data = request.json
    notification_ids = data.get('notification_ids', [])
    
    for notification_id in notification_ids:
        notification = Notification.query.get(notification_id)
        if notification and notification.user_id == session.get('user_id'):
            notification.read = True
    
    db.session.commit()
    return jsonify({'result': 'success'})

@app.route('/api/notifications/clear', methods=['POST'])
@login_required
def clear_notifications():
    user_id = session.get('user_id')
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'result': 'success'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5005, debug=True)