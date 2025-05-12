# /home/livon/projects/today_todo/config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

class Config:
    # 기본 설정
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'todo_secret_key'
    DEBUG = False
    TESTING = False
    
    # 데이터베이스 설정
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI') or 'mysql+pymysql://livon:dks12345@mysql:3306/today_todo'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 세션 설정
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # 업로드 설정
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static/uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    
class DevelopmentConfig(Config):
    DEBUG = True
    
class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
class ProductionConfig(Config):
    # 프로덕션 환경에서는 환경 변수에서 설정 로드
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or Config.SQLALCHEMY_DATABASE_URI
    SECRET_KEY = os.environ.get('SECRET_KEY') or Config.SECRET_KEY
    
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}