# Dockerfile
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 업데이트 및 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 종속성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY . .

# 환경 변수 설정
ENV FLASK_APP=app.py
ENV FLASK_ENV=production
ENV IS_DOCKER=true
ENV PYTHONUNBUFFERED=1

# 업로드 디렉토리 생성
RUN mkdir -p app/static/uploads

# 포트 노출
EXPOSE 5005

# 헬스체크 추가
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5005/health', timeout=3)" || exit 1

# 애플리케이션 실행
CMD ["python", "app.py"]