# app/__init__.py
from flask import Flask
from config import config
from app.extensions import db
import os

def create_app(config_name):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # 확장 초기화
    db.init_app(app)
    
    # 업로드 폴더 생성
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 블루프린트 등록
    from app.auth.routes import auth as auth_blueprint
    from app.main.routes import main as main_blueprint
    from app.social.routes import social as social_blueprint
    
    app.register_blueprint(auth_blueprint)
    app.register_blueprint(main_blueprint)
    app.register_blueprint(social_blueprint)
    
    # 데이터베이스 초기화
    with app.app_context():
        db.create_all()
        from app.utils import create_default_user
        create_default_user()
    
    return app