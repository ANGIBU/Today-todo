# app/api/routes.py
from flask import jsonify, request, session
from flask_login import current_user, login_required
from app import db
from app.models import Todo, Category, Notification, User
from app.api import api
import datetime
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

# 세션에서 사용자 정보 가져오기
def get_user_info():
    user_id = session.get('user_id')
    anonymous_id = session.get('anonymous_id')
    
    print(f"세션 정보: {session}")
    
    if current_user.is_authenticated:
        print(f"인증된 사용자: {current_user.id}")
        return current_user.id, None, current_user
    
    if user_id:
        user = User.query.get(user_id)
        if user:
            print(f"인증된 사용자: {user.id}")
            return user_id, None, user
        else:
            print(f"세션의 사용자 ID가 유효하지 않음: {user_id}")
    
    print(f"비인증 사용자 - anonymous_id: {anonymous_id}, user_id: {user_id}")
    return user_id, anonymous_id, None

# Todo API 엔드포인트
@api.route('/todos', methods=['GET'])
def get_todos():
    """사용자의 할 일 목록 가져오기"""
    try:
        user_id, anonymous_id, user = get_user_info()
        
        if user_id:
            todos = Todo.query.filter_by(user_id=user_id).all()
            print(f"조회된 할 일 수: {len(todos)}")
            return jsonify([todo.to_dict() for todo in todos])
        
        return jsonify([])
    except Exception as e:
        logger.error(f"할 일 조회 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/todos', methods=['POST'])
def create_todo():
    """새로운 할 일 생성"""
    try:
        data = request.json
        user_id, anonymous_id, user = get_user_info()
        
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
            is_public=data.get('is_public', False),
            user_id=user_id
        )
        
        db.session.add(todo)
        db.session.commit()
        
        return jsonify(todo.to_dict()), 201
    except Exception as e:
        logger.error(f"할 일 생성 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """할 일 업데이트"""
    try:
        data = request.json
        user_id, anonymous_id, user = get_user_info()
        
        # 할 일 찾기
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
        if 'is_public' in data:
            todo.is_public = data['is_public']
        
        db.session.commit()
        
        return jsonify(todo.to_dict())
    except Exception as e:
        logger.error(f"할 일 업데이트 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """할 일 삭제"""
    try:
        user_id, anonymous_id, user = get_user_info()
        
        # 할 일 찾기
        todo = Todo.query.filter_by(id=todo_id, user_id=user_id).first()
        
        if not todo:
            return jsonify({'error': '할 일을 찾을 수 없습니다.'}), 404
        
        db.session.delete(todo)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"할 일 삭제 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/todos/<int:todo_id>/toggle-pin', methods=['POST'])
def toggle_pin(todo_id):
    """할 일 핀 상태 토글"""
    try:
        user_id, anonymous_id, user = get_user_info()
        
        # 할 일 찾기
        todo = Todo.query.filter_by(id=todo_id, user_id=user_id).first()
        
        if not todo:
            return jsonify({'error': '할 일을 찾을 수 없습니다.'}), 404
        
        # 핀 상태 토글
        todo.pinned = not todo.pinned
        db.session.commit()
        
        return jsonify(todo.to_dict())
    except Exception as e:
        logger.error(f"할 일 핀 토글 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

# 카테고리(Topic) API 엔드포인트
@api.route('/topics', methods=['GET'])
def get_categories():
    """사용자의 카테고리 목록 가져오기"""
    try:
        user_id, anonymous_id, user = get_user_info()
        
        categories = []
        if user_id:
            categories = Category.query.filter_by(user_id=user_id).all()
            print(f"조회된 카테고리 수: {len(categories)}")
            
        return jsonify([category.to_dict() for category in categories])
    except Exception as e:
        logger.error(f"카테고리 조회 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/topics', methods=['POST'])
def create_category():
    """새로운 카테고리 생성"""
    try:
        data = request.json
        user_id, anonymous_id, user = get_user_info()
        
        # 필수 필드 검증
        if not data.get('name'):
            return jsonify({'error': '카테고리명은 필수입니다.'}), 400
        
        category = Category(
            name=data.get('name'),
            color=data.get('color', '#3498db'),
            user_id=user_id
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify(category.to_dict()), 201
    except Exception as e:
        logger.error(f"카테고리 생성 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/topics/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """카테고리 업데이트"""
    try:
        data = request.json
        user_id, anonymous_id, user = get_user_info()
        
        # 카테고리 찾기
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
    except Exception as e:
        logger.error(f"카테고리 업데이트 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/topics/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """카테고리 삭제"""
    try:
        user_id, anonymous_id, user = get_user_info()
        
        # 카테고리 찾기
        category = Category.query.filter_by(id=category_id, user_id=user_id).first()
        
        if not category:
            return jsonify({'error': '카테고리를 찾을 수 없습니다.'}), 404
        
        # 관련 할 일의 카테고리 ID 제거 (카테고리 없음으로 설정)
        todos = Todo.query.filter_by(category_id=category_id, user_id=user_id).all()
        
        for todo in todos:
            todo.category_id = None
        
        # 카테고리 삭제
        db.session.delete(category)
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"카테고리 삭제 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

# 알림 API 엔드포인트
@api.route('/notifications', methods=['GET'])
@login_required
def get_notifications():
    """사용자의 알림 목록 가져오기"""
    try:
        notifications = Notification.query.filter_by(user_id=current_user.id)\
                                        .order_by(Notification.created_at.desc())\
                                        .all()
        return jsonify([notification.to_dict() for notification in notifications])
    except Exception as e:
        logger.error(f"알림 조회 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    """모든 알림을 읽음으로 표시"""
    try:
        notifications = Notification.query.filter_by(user_id=current_user.id, read=False).all()
        for notification in notifications:
            notification.read = True
        
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"알림 읽음 처리 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

@api.route('/notifications/clear', methods=['DELETE'])
@login_required
def clear_notifications():
    """모든 알림 삭제"""
    try:
        Notification.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"알림 삭제 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '서버 오류가 발생했습니다.'}), 500

# Explore API 엔드포인트 - explore.js가 기대하는 구조로 수정
@api.route('/explore/users', methods=['GET'])
def get_explore_users():
    """탐색 페이지 사용자 목록 - 팔로우 중인 사용자와 추천 사용자"""
    try:
        # 로그인 확인
        if current_user.is_authenticated:
            current_user_id = current_user.id
        else:
            current_user_id = session.get('user_id')
        
        if not current_user_id:
            return jsonify({'following': [], 'recommended': []}), 200
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'following': [], 'recommended': []}), 200
        
        # 팔로우 중인 사용자
        following_users = user.followed.all()
        following_result = []
        for follow_user in following_users:
            following_result.append({
                'id': follow_user.id,
                'username': follow_user.username,
                'nickname': follow_user.nickname or follow_user.username,
                'profile_image': follow_user.profile_image
            })
        
        # 추천 사용자 (자신과 이미 팔로우한 사용자 제외)
        following_ids = [u.id for u in following_users]
        following_ids.append(current_user_id)
        recommended_users = User.query.filter(~User.id.in_(following_ids)).limit(10).all()
        
        recommended_result = []
        for rec_user in recommended_users:
            recommended_result.append({
                'id': rec_user.id,
                'username': rec_user.username,
                'nickname': rec_user.nickname or rec_user.username,
                'profile_image': rec_user.profile_image,
                'is_following': False
            })
        
        return jsonify({
            'following': following_result,
            'recommended': recommended_result
        })
    except Exception as e:
        logger.error(f"탐색 사용자 조회 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify({'following': [], 'recommended': []}), 200

@api.route('/explore/todos', methods=['GET'])
def get_explore_todos():
    """팔로우 중인 사용자의 공개 할 일 목록 - 배열 형태로 반환"""
    try:
        # 로그인 확인
        if current_user.is_authenticated:
            current_user_id = current_user.id
        else:
            current_user_id = session.get('user_id')
        
        if not current_user_id:
            return jsonify([]), 200
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify([]), 200
        
        # 팔로우 중인 사용자의 공개 할 일
        followed_todos = user.followed_todos().all()
        
        result = []
        for todo in followed_todos:
            todo_user = User.query.get(todo.user_id)
            if not todo_user:
                continue
                
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
                'description': todo.description or '',
                'date': todo.date.strftime('%Y-%m-%d'),
                'completed': todo.completed,
                'category': category,
                'category_color': category_color,
                'created_at': todo.created_at.strftime('%Y-%m-%d %H:%M'),
                'user': {
                    'id': todo_user.id,
                    'username': todo_user.username,
                    'nickname': todo_user.nickname or todo_user.username,
                    'profile_image': todo_user.profile_image
                }
            })
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"탐색 할 일 조회 중 오류 발생: {str(e)}")
        db.session.rollback()
        return jsonify([]), 200

# 팔로우 API 엔드포인트
@api.route('/users/<int:user_id>/follow', methods=['POST'])
def follow_user(user_id):
    """사용자 팔로우"""
    try:
        # 로그인 확인
        if current_user.is_authenticated:
            current_user_id = current_user.id
            current_user_obj = current_user
        else:
            current_user_id = session.get('user_id')
            if not current_user_id:
                return jsonify({'error': '로그인이 필요합니다.'}), 401
            current_user_obj = User.query.get(current_user_id)
            if not current_user_obj:
                return jsonify({'error': '로그인이 필요합니다.'}), 401
        
        if current_user_id == user_id:
            return jsonify({'error': '자신을 팔로우할 수 없습니다.'}), 400
            
        user_to_follow = User.query.get(user_id)
        if not user_to_follow:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        current_user_obj.follow(user_to_follow)
        db.session.commit()
        
        # 알림 생성
        from app.utils import create_notification
        message = f"{current_user_obj.nickname or current_user_obj.username}님이 회원님을 팔로우하기 시작했습니다."
        create_notification(user_id, message, 'follow', current_user_id)
        
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"팔로우 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '팔로우 처리 중 오류가 발생했습니다.'}), 500

@api.route('/users/<int:user_id>/unfollow', methods=['POST'])
def unfollow_user(user_id):
    """사용자 언팔로우"""
    try:
        # 로그인 확인
        if current_user.is_authenticated:
            current_user_id = current_user.id
            current_user_obj = current_user
        else:
            current_user_id = session.get('user_id')
            if not current_user_id:
                return jsonify({'error': '로그인이 필요합니다.'}), 401
            current_user_obj = User.query.get(current_user_id)
            if not current_user_obj:
                return jsonify({'error': '로그인이 필요합니다.'}), 401
            
        user_to_unfollow = User.query.get(user_id)
        if not user_to_unfollow:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        current_user_obj.unfollow(user_to_unfollow)
        db.session.commit()
        
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"언팔로우 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '언팔로우 처리 중 오류가 발생했습니다.'}), 500