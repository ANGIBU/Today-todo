# config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'todo_secret_key_change_this_in_production'
    DEBUG = False
    TESTING = False

    # Docker 환경 체크
    IS_DOCKER = os.environ.get('IS_DOCKER', 'false').lower() == 'true'
    
    # MySQL 연결 설정 - 환경변수 우선, 없으면 기본값
    # Docker 내부에서는 mysql 호스트명 사용, 외부에서는 localhost 또는 IP
    if os.environ.get('SQLALCHEMY_DATABASE_URI'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    elif IS_DOCKER:
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://livon:dks12345@mysql:3306/today_todo?charset=utf8mb4'
    else:
        # 로컬 개발환경에서는 Docker의 MySQL 포트로 연결
        SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://livon:dks12345@localhost:3306/today_todo?charset=utf8mb4'
    
    # 백업용 SQLite 설정 (MySQL 연결 실패시)
    SQLITE_DATABASE_URI = 'sqlite:///todo_app.db'
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_POOL_RECYCLE = 3600  # 1시간마다 연결 재생성
    SQLALCHEMY_POOL_TIMEOUT = 30
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_MAX_OVERFLOW = 20
    
    # 연결 풀 설정
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 3600,
        'connect_args': {
            'connect_timeout': 10,
            'read_timeout': 10,
            'write_timeout': 10,
            'charset': 'utf8mb4'
        }
    }

    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

class DevelopmentConfig(Config):
    DEBUG = True
    # 개발환경에서는 환경변수의 DATABASE_URI를 사용, 없으면 SQLite
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', Config.SQLITE_DATABASE_URI)

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class ProductionConfig(Config):
    # 운영환경에서는 환경변수에서 가져오거나 Docker MySQL 사용
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or \
        'mysql+pymysql://livon:dks12345@mysql:3306/today_todo?charset=utf8mb4'

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}