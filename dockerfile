# ~/projects/today_todo/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install gunicorn flask flask-sqlalchemy pymysql flask-cors

# 애플리케이션 코드 복사
COPY . .

# 로그 디렉토리 설정
RUN mkdir -p /app/logs && chmod 777 /app/logs

# 실행 설정
EXPOSE 80
CMD ["flask", "run", "--host=0.0.0.0", "--port=80"]