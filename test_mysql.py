# test_mysql.py
import pymysql

try:
    connection = pymysql.connect(
        host='192.168.123.104',
        port=3306,
        user='livon',
        password='dks12345',
        database='today_todo',
        connect_timeout=10
    )
    print("MySQL 연결 성공!")
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"쿼리 결과: {result}")
        
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"테이블 목록: {tables}")
    
    connection.close()
    
except Exception as e:
    print(f"MySQL 연결 실패: {e}")
    print(f"오류 타입: {type(e).__name__}")