# config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'todo_secret_key'
    DEBUG = False
    TESTING = False

    # SQLite를 기본 데이터베이스로 설정 (MySQL 연결 실패시 대안)
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or 'sqlite:///todo_app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app', 'static', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

class DevelopmentConfig(Config):
    DEBUG = True
    # 개발환경에서는 SQLite 사용
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or 'sqlite:///todo_dev.db'

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

class ProductionConfig(Config):
    # 운영환경에서는 환경변수에서 데이터베이스 URI를 반드시 가져와야 함
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI')
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("운영환경에서는 SQLALCHEMY_DATABASE_URI 환경변수가 필요합니다.")

config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}