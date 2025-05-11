# app/api/routes.py
from flask import jsonify, request, session
from flask_login import current_user
from app import db
from app.models import Todo, Category, Notification
from . import api
import datetime

# 디버그 엔드포인트
@api.route('/debug', methods=['GET'])
def debug_info():
    """디버깅을 위한 사용자 정보 반환"""
    debug_data = {
        'is_authenticated': current_user.is_authenticated,
        'session_user_id': session.get('user_id'),
        'session_anonymous_id': session.get('anonymous_id')
    }
    
    if current_user.is_authenticated:
        debug_data['user_id'] = current_user.id
        debug_data['username'] = current_user.username
    
    return jsonify(debug_data)

# Todo API 엔드포인트
@api.route('/todos', methods=['GET'])
def get_todos():
    """사용자의 할 일 목록 가져오기"""
    print(f"세션 정보: {session}")
    if current_user.is_authenticated:
        # 로그인한 사용자의 할 일 목록
        print(f"인증된 사용자: {current_user.id}")
        todos = Todo.query.filter_by(user_id=current_user.id).all()
    else:
        # 임시 사용자 ID 사용 (session 기반)
        anonymous_id = session.get('anonymous_id')
        user_id = session.get('user_id')
        print(f"비인증 사용자 - anonymous_id: {anonymous_id}, user_id: {user_id}")
        
        # anonymous_id 또는 user_id 둘 중 하나를 사용
        todos = Todo.query.filter_by(user_id=user_id).all() if user_id else []
    
    print(f"조회된 할 일 수: {len(todos)}")
    return jsonify([todo.to_dict() for todo in todos])

@api.route('/todos', methods=['POST'])
def create_todo():
    """새로운 할 일 생성"""
    data = request.json
    
    # 필수 필드 검증
    if not data.get('title'):
        return jsonify({'error': '제목은 필수입니다.'}), 400
    
    # 날짜 처리
    date_str = data.get('date', datetime.date.today().isoformat())
    if isinstance(date_str, str):
        try:
            date = datetime.datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': '날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식이어야 합니다.'}), 400
    else:
        date = date_str
    
    # Todo 객체 생성
    todo = Todo(
        title=data.get('title'),
        description=data.get('description', ''),
        date=date,
        category_id=data.get('category_id'),
        pinned=data.get('pinned', False),
        completed=data.get('completed', False),
        is_public=data.get('is_public', False)
    )
    
    # 사용자 ID 설정
    if current_user.is_authenticated:
        todo.user_id = current_user.id
    else:
        # 임시 사용자 ID 사용
        todo.user_id = session.get('user_id')
    
    db.session.add(todo)
    db.session.commit()
    
    return jsonify(todo.to_dict()), 201

@api.route('/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """할 일 업데이트"""
    data = request.json
    
    # 할 일 찾기
    if current_user.is_authenticated:
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first()
    else:
        user_id = session.get('user_id')
        todo = Todo.query.filter_by(id=todo_id, user_id=user_id).first()
    
    if not todo:
        return jsonify({'error': '할 일을 찾을 수 없습니다.'}), 404
    
    # 데이터 업데이트
    if 'title' in data:
        todo.title = data['title']
    if 'description' in data:
        todo.description = data['description']
    if 'date' in data:
        if isinstance(data['date'], str):
            try:
                todo.date = datetime.datetime.strptime(data['date'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'error': '날짜 형식이 잘못되었습니다. YYYY-MM-DD 형식이어야 합니다.'}), 400
        else:
            todo.date = data['date']
    if 'category_id' in data:
        todo.category_id = data['category_id']
    if 'pinned' in data:
        todo.pinned = data['pinned']
    if 'completed' in data:
        todo.completed = data['completed']
    if 'is_public' in data and current_user.is_authenticated:
        todo.is_public = data['is_public']
    
    db.session.commit()
    
    return jsonify(todo.to_dict())

@api.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """할 일 삭제"""
    # 할 일 찾기
    if current_user.is_authenticated:
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first()
    else:
        user_id = session.get('user_id')
        todo = Todo.query.filter_by(id=todo_id, user_id=user_id).first()
    
    if not todo:
        return jsonify({'error': '할 일을 찾을 수 없습니다.'}), 404
    
    db.session.delete(todo)
    db.session.commit()
    
    return jsonify({'success': True})

@api.route('/todos/<int:todo_id>/toggle-pin', methods=['POST'])
def toggle_pin(todo_id):
    """할 일 핀 상태 토글"""
    # 할 일 찾기
    if current_user.is_authenticated:
        todo = Todo.query.filter_by(id=todo_id, user_id=current_user.id).first()
    else:
        user_id = session.get('user_id')
        todo = Todo.query.filter_by(id=todo_id, user_id=user_id).first()
    
    if not todo:
        return jsonify({'error': '할 일을 찾을 수 없습니다.'}), 404
    
    # 핀 상태 토글
    todo.pinned = not todo.pinned
    db.session.commit()
    
    return jsonify(todo.to_dict())

# 카테고리(Category) API 엔드포인트
@api.route('/topics', methods=['GET'])
def get_categories():
    """사용자의 카테고리 목록 가져오기"""
    print(f"세션 정보: {session}")
    if current_user.is_authenticated:
        print(f"인증된 사용자 카테고리 조회: {current_user.id}")
        categories = Category.query.filter_by(user_id=current_user.id).all()
    else:
        user_id = session.get('user_id')
        print(f"비인증 사용자 카테고리 조회 - user_id: {user_id}")
        categories = Category.query.filter_by(user_id=user_id).all()
    
    print(f"조회된 카테고리 수: {len(categories)}")
    return jsonify([category.to_dict() for category in categories])

@api.route('/topics', methods=['POST'])
def create_category():
    """새로운 카테고리 생성"""
    data = request.json
    
    # 필수 필드 검증
    if not data.get('name'):
        return jsonify({'error': '카테고리명은 필수입니다.'}), 400
    
    category = Category(
        name=data.get('name'),
        color=data.get('color', '#3498db')
    )
    
    # 사용자 ID 설정
    if current_user.is_authenticated:
        category.user_id = current_user.id
    else:
        # 임시 사용자 ID 사용
        category.user_id = session.get('user_id')
    
    db.session.add(category)
    db.session.commit()
    
    return jsonify(category.to_dict()), 201

@api.route('/topics/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """카테고리 업데이트"""
    data = request.json
    
    # 카테고리 찾기
    if current_user.is_authenticated:
        category = Category.query.filter_by(id=category_id, user_id=current_user.id).first()
    else:
        user_id = session.get('user_id')
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    
    if not category:
        return jsonify({'error': '카테고리를 찾을 수 없습니다.'}), 404
    
    # 데이터 업데이트
    if 'name' in data:
        category.name = data['name']
    if 'color' in data:
        category.color = data['color']
    
    db.session.commit()
    
    return jsonify(category.to_dict())

@api.route('/topics/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """카테고리 삭제"""
    # 카테고리 찾기
    if current_user.is_authenticated:
        category = Category.query.filter_by(id=category_id, user_id=current_user.id).first()
    else:
        user_id = session.get('user_id')
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
    
    if not category:
        return jsonify({'error': '카테고리를 찾을 수 없습니다.'}), 404
    
    # 관련 할 일의 카테고리 ID 제거 (카테고리 없음으로 설정)
    if current_user.is_authenticated:
        todos = Todo.query.filter_by(category_id=category_id, user_id=current_user.id).all()
    else:
        user_id = session.get('user_id')
        todos = Todo.query.filter_by(category_id=category_id, user_id=user_id).all()
    
    for todo in todos:
        todo.category_id = None
    
    # 카테고리 삭제
    db.session.delete(category)
    db.session.commit()
    
    return jsonify({'success': True})

# 알림 API 엔드포인트
@api.route('/notifications', methods=['GET'])
def get_notifications():
    """사용자의 알림 목록 가져오기"""
    if current_user.is_authenticated:
        # 로그인한 사용자의 알림만 가져옴
        notifications = Notification.query.filter_by(user_id=current_user.id)\
                                         .order_by(Notification.created_at.desc())\
                                         .all()
        return jsonify([notification.to_dict() for notification in notifications])
    else:
        # 비로그인 사용자는 빈 배열 반환
        return jsonify([])

@api.route('/notifications/read', methods=['POST'])
def mark_notifications_read():
    """모든 알림을 읽음으로 표시"""
    if not current_user.is_authenticated:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    notifications = Notification.query.filter_by(user_id=current_user.id, read=False).all()
    for notification in notifications:
        notification.read = True
    
    db.session.commit()
    return jsonify({'success': True})

@api.route('/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    """특정 알림을 읽음으로 표시"""
    if not current_user.is_authenticated:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    notification = Notification.query.filter_by(id=notification_id, user_id=current_user.id).first()
    if not notification:
        return jsonify({'error': '알림을 찾을 수 없습니다.'}), 404
    
    notification.read = True
    db.session.commit()
    
    return jsonify({'success': True})

@api.route('/notifications/clear', methods=['DELETE'])
def clear_notifications():
    """모든 알림 삭제"""
    if not current_user.is_authenticated:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    Notification.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    
    return jsonify({'success': True})