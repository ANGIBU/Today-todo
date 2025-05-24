# test_mysql.py
import pymysql
import os

def test_mysql_connection():
    """MySQL 연결 테스트"""
    
    # Docker 환경 체크
    is_docker = os.environ.get('IS_DOCKER', 'false').lower() == 'true'
    
    if is_docker:
        host = 'mysql'  # Docker 컨테이너 이름
        print("Docker 환경에서 MySQL 연결 테스트 중...")
    else:
        host = '192.168.123.104'  # Docker 호스트 IP
        print("로컬 환경에서 MySQL 연결 테스트 중...")
    
    connection_configs = [
        {
            'host': host,
            'port': 3306,
            'user': 'livon',
            'password': 'dks12345',
            'database': 'today_todo',
            'connect_timeout': 10,
            'charset': 'utf8mb4'
        }
    ]
    
    # 로컬 환경인 경우 localhost도 테스트
    if not is_docker:
        connection_configs.append({
            'host': 'localhost',
            'port': 3306,
            'user': 'livon',
            'password': 'dks12345',
            'database': 'today_todo',
            'connect_timeout': 10,
            'charset': 'utf8mb4'
        })
    
    for i, config in enumerate(connection_configs, 1):
        print(f"\n--- 연결 테스트 {i}: {config['host']}:{config['port']} ---")
        
        try:
            connection = pymysql.connect(**config)
            print(f"✅ MySQL 연결 성공! ({config['host']})")
            
            with connection.cursor() as cursor:
                # 기본 쿼리 테스트
                cursor.execute("SELECT 1 as test")
                result = cursor.fetchone()
                print(f"기본 쿼리 결과: {result}")
                
                # 데이터베이스 확인
                cursor.execute("SELECT DATABASE()")
                db_result = cursor.fetchone()
                print(f"현재 데이터베이스: {db_result}")
                
                # 테이블 목록 확인
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"테이블 목록: {[table[0] for table in tables]}")
                
                # user 테이블이 있는 경우 데이터 확인
                if any('user' in str(table) for table in tables):
                    cursor.execute("SELECT COUNT(*) as user_count FROM user")
                    user_count = cursor.fetchone()
                    print(f"사용자 수: {user_count[0]}")
            
            connection.close()
            print(f"연결 종료 완료")
            return True
            
        except Exception as e:
            print(f"❌ MySQL 연결 실패 ({config['host']}): {e}")
            print(f"오류 타입: {type(e).__name__}")
            continue
    
    return False

if __name__ == "__main__":
    success = test_mysql_connection()
    
    if success:
        print("\n🎉 MySQL 연결 테스트 성공!")
    else:
        print("\n💥 모든 MySQL 연결 테스트 실패!")
        print("\n해결 방법:")
        print("1. Docker 컨테이너가 실행 중인지 확인: docker ps")
        print("2. MySQL 로그 확인: docker logs mysql")
        print("3. 네트워크 연결 확인: docker network ls")
        print("4. 포트 확인: netstat -tlnp | grep 3306")