# app/social/routes.py
from flask import render_template, jsonify, request, session
from flask_login import current_user
from app.social import social
from app.models import User, Todo, Category, Notification
from app.extensions import db
from app.utils import login_required, create_notification
import logging

logger = logging.getLogger(__name__)

@social.route('/explore')
def explore():
    """둘러보기 페이지 (커뮤니티 페이지)"""
    user = None
    if current_user.is_authenticated:
        user = current_user
    elif session.get('user_id'):
        try:
            user = User.query.get(session['user_id'])
        except Exception as e:
            logger.error(f"사용자 조회 중 오류: {e}")
            user = None
    
    return render_template('public/explore.html', user=user, active_page='explore')

@social.route('/api/explore/users', methods=['GET'])
def get_explore_users():
    """탐색 페이지 사용자 목록"""
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
        logger.error(f"사용자 목록 조회 중 오류: {e}")
        return jsonify({'following': [], 'recommended': []}), 200

@social.route('/api/explore/todos', methods=['GET'])
def get_explore_todos():
    """팔로우 중인 사용자의 공개 할 일 목록"""
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
        logger.error(f"할 일 목록 조회 중 오류: {e}")
        return jsonify([]), 200

# 팔로우 API 엔드포인트
@social.route('/api/users/<int:user_id>/follow', methods=['POST'])
@login_required
def follow_user(user_id):
    """사용자 팔로우"""
    try:
        current_user_id = session.get('user_id')
        if current_user_id == user_id:
            return jsonify({'error': '자신을 팔로우할 수 없습니다.'}), 400
        
        current_user = User.query.get(current_user_id)
        if not current_user:
            return jsonify({'error': '로그인이 필요합니다.'}), 401
            
        user_to_follow = User.query.get(user_id)
        if not user_to_follow:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        current_user.follow(user_to_follow)
        db.session.commit()
        
        # 알림 생성
        message = f"{current_user.nickname or current_user.username}님이 회원님을 팔로우하기 시작했습니다."
        create_notification(user_id, message, 'follow', current_user_id)
        
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"팔로우 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '팔로우 처리 중 오류가 발생했습니다.'}), 500

@social.route('/api/users/<int:user_id>/unfollow', methods=['POST'])
@login_required
def unfollow_user(user_id):
    """사용자 언팔로우"""
    try:
        current_user_id = session.get('user_id')
        current_user = User.query.get(current_user_id)
        if not current_user:
            return jsonify({'error': '로그인이 필요합니다.'}), 401
            
        user_to_unfollow = User.query.get(user_id)
        if not user_to_unfollow:
            return jsonify({'error': '사용자를 찾을 수 없습니다.'}), 404
        
        current_user.unfollow(user_to_unfollow)
        db.session.commit()
        
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"언팔로우 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '언팔로우 처리 중 오류가 발생했습니다.'}), 500

# 알림 API 엔드포인트
@social.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """알림 목록 반환"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify([])
            
        notifications = Notification.query.filter_by(user_id=user_id)\
                                        .order_by(Notification.created_at.desc())\
                                        .all()
        
        result = [notification.to_dict() for notification in notifications]
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"알림 조회 중 오류: {e}")
        return jsonify([])

@social.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    """알림 읽음 표시"""
    try:
        data = request.json
        notification_ids = data.get('notification_ids', [])
        user_id = session.get('user_id')
        
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다.'}), 401
        
        for notification_id in notification_ids:
            notification = Notification.query.get(notification_id)
            if notification and notification.user_id == user_id:
                notification.is_read = True
        
        db.session.commit()
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"알림 읽음 처리 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '처리 중 오류가 발생했습니다.'}), 500

@social.route('/api/notifications/clear', methods=['POST'])
@login_required
def clear_notifications():
    """모든 알림 삭제"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': '로그인이 필요합니다.'}), 401
            
        Notification.query.filter_by(user_id=user_id).delete()
        db.session.commit()
        return jsonify({'result': 'success'})
    except Exception as e:
        logger.error(f"알림 삭제 중 오류: {e}")
        db.session.rollback()
        return jsonify({'error': '처리 중 오류가 발생했습니다.'}), 500