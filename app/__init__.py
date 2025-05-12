# app/__init__.py
import os
from flask import Flask, session, request
from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import uuid

# 데이터베이스 초기화
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'auth.auth_page'

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # 설정 로드
    if config_name == 'production':
        app.config.from_object('config.ProductionConfig')
    else:
        app.config.from_object('config.DevelopmentConfig')
    
    # 데이터베이스 설정
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    
    # 유저 로더 설정
    from app.models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # 익명 사용자 세션 관리
    @app.before_request
    def assign_anonymous_id():
        if not current_user.is_authenticated and request.endpoint != 'static':
            if 'anonymous_id' not in session:
                session['anonymous_id'] = str(uuid.uuid4())
                session['user_id'] = 1  # 기본 임시 사용자 ID
    
    # 블루프린트 등록
    from app.auth import auth as auth_blueprint
    from app.main import main as main_blueprint
    from app.social import social as social_blueprint
    from app.api import api as api_blueprint
    
    app.register_blueprint(auth_blueprint, url_prefix='/auth')
    app.register_blueprint(main_blueprint)
    app.register_blueprint(social_blueprint, url_prefix='/social')
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # 데이터베이스 생성 (오류 처리 추가)
    with app.app_context():
        try:
            db.create_all()
            # 임시 사용자 생성 확인
            temp_user = User.query.filter_by(id=1).first()
            if not temp_user:
                temp_user = User(
                    id=1,
                    username='temp_user',
                    email='temp@example.com',
                    nickname='임시 사용자'
                )
                temp_user.set_password('temp123')
                db.session.add(temp_user)
                db.session.commit()
        except Exception as e:
            print(f"데이터베이스 초기화 중 오류: {e}")
    
    return app

# 순환 참조 방지
from flask_login import current_user