# reset_db.py
import os
from app import app, db
from models import Category

def reset_database():
    with app.app_context():
        # 데이터베이스 테이블 삭제 후 재생성
        db.drop_all()
        print("데이터베이스 테이블 삭제 완료")
        
        db.create_all()
        print("데이터베이스 테이블 생성 완료")
        
        # 기본 카테고리 생성
        default_categories = [
            {'name': '카테고리 1', 'color': '#FF5733', 'user_id': 1},
            {'name': '카테고리 2', 'color': '#33FF57', 'user_id': 1},
            {'name': '카테고리 3', 'color': '#3357FF', 'user_id': 1}
        ]
        for cat in default_categories:
            db.session.add(Category(**cat))
        db.session.commit()
        print("기본 카테고리 생성 완료")
        
        return True

if __name__ == '__main__':
    print("데이터베이스를 재설정합니다. 모든 데이터가 삭제됩니다.")
    confirm = input("계속하시겠습니까? (y/n): ")
    
    if confirm.lower() == 'y':
        success = reset_database()
        if success:
            print("데이터베이스 재설정이 완료되었습니다.")
        else:
            print("데이터베이스 재설정에 실패했습니다.")
    else:
        print("데이터베이스 재설정이 취소되었습니다.")