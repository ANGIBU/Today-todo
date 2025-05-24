# app/__init__.py
import os
from flask import Flask, session, request, g
from flask_login import LoginManager, current_user
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import uuid
import logging
import pymysql

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 데이터베이스 초기화
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'auth.auth_page'

def test_mysql_connection(uri):
    """MySQL 연결 테스트"""
    try:
        # URI에서 연결 정보 추출
        if 'mysql' in uri:
            parts = uri.split('@')[0].split('//')[1].split(':')
            user = parts[0]
            password = parts[1]
            
            host_db = uri.split('@')[1]
            host = host_db.split(':')[0]
            port_db = host_db.split(':')[1]
            port = int(port_db.split('/')[0])
            database = port_db.split('/')[1].split('?')[0]
            
            connection = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                connect_timeout=5
            )
            connection.close()
            return True
    except Exception as e:
        logger.error(f"MySQL 연결 테스트 실패: {e}")
        return False
    return False

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # 설정 로드
    if config_name == 'production':
        app.config.from_object('config.ProductionConfig')
    else:
        app.config.from_object('config.DevelopmentConfig')
    
    # MySQL 연결 테스트
    original_uri = app.config['SQLALCHEMY_DATABASE_URI']
    is_mysql = 'mysql' in original_uri
    
    if is_mysql:
        mysql_available = test_mysql_connection(original_uri)
        
        if not mysql_available:
            logger.warning("MySQL 연결 실패. SQLite로 폴백합니다.")
            app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo_fallback.db'
            # SQLite 사용 시 MySQL 전용 설정 제거
            app.config.pop('SQLALCHEMY_ENGINE_OPTIONS', None)
        else:
            # MySQL 사용 시 연결 풀 설정
            app.config.setdefault('SQLALCHEMY_ENGINE_OPTIONS', {
                'pool_size': 5,
                'max_overflow': 10,
                'pool_recycle': 300,
                'pool_pre_ping': True,
                'pool_timeout': 30
            })
    
    # 디버그 설정
    if app.config['DEBUG']:
        logging.basicConfig(level=logging.DEBUG)
    
    # 확장 프로그램 초기화
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    
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
    
        # 데이터베이스 초기화
        try:
            # 데이터베이스 연결 테스트
            if 'sqlite' in str(db.engine.url):
                # SQLite용 간단한 테스트
                db.engine.execute('SELECT 1')
            else:
                # MySQL용 테스트
                with db.engine.connect() as conn:
                    result = conn.execute(db.text('SELECT 1'))
                    result.fetchone()
            logger.info("데이터베이스 연결 성공")
            
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
            logger.error(f"데이터베이스 초기화 중 오류: {e}")
            logger.warning("애플리케이션은 계속 실행되지만 데이터베이스 기능은 제한될 수 있습니다.")
    
    return app