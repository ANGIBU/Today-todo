# app/__init__.py
import os
from flask import Flask, session, request, g
from flask_login import LoginManager, current_user
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import uuid
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    
    # 데이터베이스 연결 풀 설정 개선
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 20,          # 기본 풀 크기 증가 (10 → 20)
        'max_overflow': 20,       # 추가 연결 허용 증가 (10 → 20)
        'pool_recycle': 300,      # 5분마다 연결 재활용
        'pool_pre_ping': True,    # 사용 전 연결 유효성 확인
        'pool_timeout': 60        # 연결 대기 시간 증가 (30 → 60)
    }
    
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
        if not request.endpoint or request.endpoint == 'static':
            return
            
        if not current_user.is_authenticated:
            if 'anonymous_id' not in session:
                session['anonymous_id'] = str(uuid.uuid4())
                session['user_id'] = 1  # 기본 임시 사용자 ID
                logger.info(f"새 익명 사용자 세션 생성: {session['anonymous_id']}")
    
    # 요청 완료 후 DB 세션 정리
    @app.teardown_appcontext
    def cleanup_db_session(exception=None):
        db.session.remove()
    
    # 블루프린트 등록
    with app.app_context():
        # 블루프린트 불러오기
        from app.auth import auth as auth_blueprint
        from app.main import main as main_blueprint
        from app.social import social as social_blueprint
        from app.api import api as api_blueprint
        
        # 블루프린트 등록
        app.register_blueprint(auth_blueprint, url_prefix='/auth')
        app.register_blueprint(main_blueprint)
        app.register_blueprint(social_blueprint, url_prefix='/social')
        app.register_blueprint(api_blueprint, url_prefix='/api')
        
        logger.info("모든 블루프린트가 성공적으로 등록되었습니다")
    
        # 데이터베이스 생성 (오류 처리 추가)
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
                logger.info("임시 사용자가 생성되었습니다")
        except Exception as e:
            logger.error(f"데이터베이스 초기화 중 오류: {e}")
            db.session.rollback()
    
    return app