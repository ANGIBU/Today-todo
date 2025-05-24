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

# 알림 API 엔드포인트 (세션 기반)
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