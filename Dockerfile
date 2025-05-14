# /home/livon/projects/today_todo/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# 파이썬 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 필요한 디렉토리 생성
RUN mkdir -p static/uploads

# 포트 설정
EXPOSE 5005

# 앱 실행
CMD ["python", "app.py"]