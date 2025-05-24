# app/__init__.py
import os
from flask import Flask, session, request, g
from flask_login import LoginManager, current_user
from flask_migrate import Migrate
from app.extensions import db, migrate, login_manager
from sqlalchemy import text
import uuid
import logging
import pymysql

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # 설정 로드
    if config_name == 'production':
        app.config.from_object('config.ProductionConfig')
    else:
        app.config.from_object('config.DevelopmentConfig')
    
    # 디버그 설정
    if app.config['DEBUG']:
        logging.basicConfig(level=logging.DEBUG)
    
    # 확장 프로그램 초기화
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.auth_page'
    
    # 유저 로더 설정
    from app.models import User
    
    @login_manager.user_loader
    def load_user(user_id):
        try:
            return User.query.get(int(user_id))
        except Exception as e:
            logger.error(f"사용자 로딩 중 오류: {e}")
            return None
    
    # 익명 사용자 세션 관리
    @app.before_request
    def assign_anonymous_id():
        if not request.endpoint or request.endpoint.startswith('static'):
            return
            
        if not current_user.is_authenticated:
            if 'anonymous_id' not in session:
                session['anonymous_id'] = str(uuid.uuid4())
                session['user_id'] = None
                logger.info(f"새 익명 사용자 세션 생성: {session['anonymous_id']}")
    
    # 요청 완료 후 DB 세션 정리
    @app.teardown_appcontext
    def cleanup_db_session(exception=None):
        db.session.remove()
    
    # 오류 핸들러 추가
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        logger.error(f"500 오류 발생: {error}")
        return "서버 내부 오류가 발생했습니다.", 500
    
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
    
        # 데이터베이스 초기화 (MySQL 전용)
        try:
            # 데이터베이스 연결 테스트
            with db.engine.connect() as conn:
                result = conn.execute(text('SELECT 1'))
                result.fetchone()
            logger.info("MySQL 데이터베이스 연결 성공")
            
            # 테이블 생성
            engine = db.engine
            inspector = db.inspect(engine)
            existing_tables = inspector.get_table_names()
            
            if 'user' not in existing_tables:
                logger.info("데이터베이스 테이블 생성 시작...")
                db.create_all()
                logger.info("데이터베이스 테이블이 성공적으로 생성되었습니다")
                
                # 기본 사용자 생성
                from app.utils import create_default_user
                try:
                    create_default_user()
                except Exception as e:
                    logger.error(f"기본 사용자 생성 중 오류: {e}")
            else:
                logger.info("데이터베이스 테이블이 이미 존재합니다.")
                
        except Exception as e:
            logger.error(f"MySQL 데이터베이스 연결 실패: {e}")
            logger.error("애플리케이션을 시작할 수 없습니다. MySQL 연결을 확인해주세요.")
            raise e  # SQLite 폴백 대신 오류 발생시켜 문제 해결 강제
    
    return app