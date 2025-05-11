# app/social/routes.py
from flask import render_template, jsonify, request, session
from app.social import social
from app.models import User, Todo, Category, Notification
from app.extensions import db
from app.utils import login_required, create_notification

@social.route('/explore')
def explore():
    """둘러보기 페이지 (커뮤니티 페이지)"""
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('public/explore.html', user=user, active_page='explore')

@social.route('/api/explore/users', methods=['GET'])
def get_explore_users():
    """탐색 페이지 사용자 목록"""
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

@social.route('/api/explore/todos', methods=['GET'])
def get_explore_todos():
    """팔로우 중인 사용자의 공개 할 일 목록"""
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

# 팔로우 API 엔드포인트
@social.route('/api/users/<int:user_id>/follow', methods=['POST'])
@login_required
def follow_user(user_id):
    """사용자 팔로우"""
    current_user_id = session.get('user_id')
    if current_user_id == user_id:
        return jsonify({'error': '자신을 팔로우할 수 없습니다.'}), 400
    
    current_user = User.query.get_or_404(current_user_id)
    user_to_follow = User.query.get_or_404(user_id)
    
    current_user.follow(user_to_follow)
    db.session.commit()
    
    # 알림 생성
    message = f"{current_user.nickname}님이 회원님을 팔로우하기 시작했습니다."
    create_notification(user_id, message, 'follow', current_user_id)
    
    return jsonify({'result': 'success'})

@social.route('/api/users/<int:user_id>/unfollow', methods=['POST'])
@login_required
def unfollow_user(user_id):
    """사용자 언팔로우"""
    current_user_id = session.get('user_id')
    current_user = User.query.get_or_404(current_user_id)
    user_to_unfollow = User.query.get_or_404(user_id)
    
    current_user.unfollow(user_to_unfollow)
    db.session.commit()
    
    return jsonify({'result': 'success'})

# 알림 API 엔드포인트
@social.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """알림 목록 반환"""
    user_id = session.get('user_id')
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    
    result = [notification.to_dict() for notification in notifications]
    
    return jsonify(result)

@social.route('/api/notifications/read', methods=['POST'])
@login_required
def mark_notifications_read():
    """알림 읽음 표시"""
    data = request.json
    notification_ids = data.get('notification_ids', [])
    
    for notification_id in notification_ids:
        notification = Notification.query.get(notification_id)
        if notification and notification.user_id == session.get('user_id'):
            notification.read = True
    
    db.session.commit()
    return jsonify({'result': 'success'})

@social.route('/api/notifications/clear', methods=['POST'])
@login_required
def clear_notifications():
    """모든 알림 삭제"""
    user_id = session.get('user_id')
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'result': 'success'})