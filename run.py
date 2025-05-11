# run.py
import os
from app import create_app

# 환경 변수에서 설정 모드를 가져오거나, 기본값으로 'development' 사용
config_name = os.environ.get('FLASK_ENV', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5005))
    app.run(host='0.0.0.0', port=port)