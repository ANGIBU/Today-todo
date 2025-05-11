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
login_manager.login_view = 'auth.login'

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
        if 'user_id' not in session and request.endpoint != 'static':
            if 'anonymous_id' not in session:
                anonymous_id = str(uuid.uuid4())
                session['anonymous_id'] = anonymous_id
                session['user_id'] = anonymous_id  # API에서 사용하기 위한 user_id 추가
    
    # 블루프린트 등록
    from app.auth import auth as auth_blueprint
    from app.main import main as main_blueprint
    from app.social import social as social_blueprint
    from app.api import api as api_blueprint
    
    app.register_blueprint(auth_blueprint, url_prefix='/auth')
    app.register_blueprint(main_blueprint)
    app.register_blueprint(social_blueprint, url_prefix='/social')
    app.register_blueprint(api_blueprint, url_prefix='/api')
    
    # 데이터베이스 생성
    with app.app_context():
        db.create_all()
    
    return app