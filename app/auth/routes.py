# app/auth/routes.py
from flask import render_template, redirect, url_for, request, session, flash, jsonify
from app.auth import auth
from app.models import User
from app.extensions import db

@auth.route('/auth')
def auth_page():
    """인증 페이지 (로그인/회원가입 선택)"""
    return render_template('public/auth.html', action='login')

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """로그인 처리"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['nickname'] = user.nickname
            return redirect(url_for('main.index'))
        
        flash('아이디 또는 비밀번호가 잘못되었습니다.')
    
    return render_template('public/auth.html', action='login')

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """회원가입 처리"""
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        nickname = request.form.get('nickname')
        
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
        
        flash('회원가입이 완료되었습니다. 로그인해주세요.')
        return redirect(url_for('auth.login'))
    
    return render_template('public/auth.html', action='register')

@auth.route('/logout')
def logout():
    """로그아웃 처리"""
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('nickname', None)
    flash('로그아웃되었습니다.')
    return redirect(url_for('main.index'))

@auth.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    """사용자 프로필 정보 반환"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())

@auth.route('/api/user/profile', methods=['PUT'])
def update_user_profile():
    """사용자 프로필 업데이트"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '로그인이 필요합니다.'}), 401
    
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'nickname' in data:
        user.nickname = data['nickname']
        session['nickname'] = data['nickname']
    if 'bio' in data:
        user.bio = data['bio']
    
    db.session.commit()
    
    return jsonify(user.to_dict())