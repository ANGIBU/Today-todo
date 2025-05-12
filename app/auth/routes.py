# app/auth/routes.py
from flask import render_template, redirect, url_for, request, session, flash, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app.auth import auth
from app.models import User, Category
from app.extensions import db
import logging

# 로깅 설정
logger = logging.getLogger(__name__)

@auth.route('/auth')
def auth_page():
    """인증 페이지 (로그인/회원가입 선택)"""
    return render_template('public/auth.html', action='login')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """로그인 처리"""
    if current_user.is_authenticated:
        return redirect(url_for('main.todo'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 로깅 추가
        logger.info(f"로그인 시도: {username}")
        
        try:
            user = User.query.filter_by(username=username).first()
            if user and user.check_password(password):
                # Flask-Login으로 로그인 처리
                login_user(user)
                
                # 세션 데이터 설정
                session['user_id'] = user.id
                session['username'] = user.username
                session['nickname'] = user.nickname
                
                logger.info(f"로그인 성공: {username}")
                flash('로그인되었습니다.', 'message')
                
                # 다음에 이동할 페이지
                next_page = request.args.get('next')
                if not next_page or next_page.startswith('/'):
                    next_page = url_for('main.todo')
                return redirect(next_page)
            
            logger.warning(f"로그인 실패 (잘못된 자격 증명): {username}")
            flash('아이디 또는 비밀번호가 잘못되었습니다.')
        except Exception as e:
            logger.error(f"로그인 중 예외 발생: {str(e)}")
            db.session.rollback()
            flash('로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    
    return render_template('public/auth.html', action='login')

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """회원가입 처리"""
    if current_user.is_authenticated:
        return redirect(url_for('main.todo'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        nickname = request.form.get('nickname')
        
        # 로깅 추가
        logger.info(f"회원가입 시도: {username}, {email}")
        
        try:
            # 사용자명 중복 확인
            if User.query.filter_by(username=username).first():
                flash('이미 존재하는 아이디입니다.')
                return render_template('public/auth.html', action='register')
            
            # 이메일 중복 확인
            if User.query.filter_by(email=email).first():
                flash('이미 존재하는 이메일입니다.')
                return render_template('public/auth.html', action='register')
            
            # 새 사용자 생성
            user = User(username=username, email=email, nickname=nickname)
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # 기본 카테고리 생성
            default_categories = [
                {'name': '업무', 'color': '#3498db'},
                {'name': '개인', 'color': '#2ecc71'},
                {'name': '중요', 'color': '#e74c3c'}
            ]
            
            for cat_data in default_categories:
                category = Category(
                    name=cat_data['name'],
                    color=cat_data['color'],
                    user_id=user.id
                )
                db.session.add(category)
            
            db.session.commit()
            
            logger.info(f"회원가입 성공: {username}")
            flash('회원가입이 완료되었습니다. 로그인해주세요.')
            return redirect(url_for('auth.login'))
        except Exception as e:
            logger.error(f"회원가입 중 예외 발생: {str(e)}")
            db.session.rollback()
            flash('회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    
    return render_template('public/auth.html', action='register')

@auth.route('/logout')
def logout():
    """로그아웃 처리"""
    username = session.get('username')
    logger.info(f"로그아웃: {username}")
    
    # Flask-Login 로그아웃
    logout_user()
    
    # 세션 데이터 삭제
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('nickname', None)
    
    flash('로그아웃되었습니다.')
    return redirect(url_for('main.index'))

@auth.route('/api/user/profile', methods=['GET'])
@login_required
def get_user_profile():
    """사용자 프로필 정보 반환"""
    try:
        return jsonify(current_user.to_dict())
    except Exception as e:
        logger.error(f"프로필 조회 중 오류: {str(e)}")
        return jsonify({'error': '사용자 정보를 가져오는 중 오류가 발생했습니다.'}), 500

@auth.route('/api/user/profile', methods=['PUT'])
@login_required
def update_user_profile():
    """사용자 프로필 업데이트"""
    try:
        data = request.json
        
        if 'nickname' in data:
            current_user.nickname = data['nickname']
            session['nickname'] = data['nickname']
        if 'bio' in data:
            current_user.bio = data['bio']
        
        db.session.commit()
        logger.info(f"프로필 업데이트 성공: {current_user.username}")
        
        return jsonify(current_user.to_dict())
    except Exception as e:
        logger.error(f"프로필 업데이트 중 오류: {str(e)}")
        db.session.rollback()
        return jsonify({'error': '프로필 업데이트 중 오류가 발생했습니다.'}), 500