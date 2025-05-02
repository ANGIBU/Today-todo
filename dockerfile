# ~/projects/today_todo/Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install flask flask-sqlalchemy pymysql gunicorn flask-cors

COPY . .

EXPOSE 80
CMD ["flask", "run", "--host=0.0.0.0", "--port=80"]