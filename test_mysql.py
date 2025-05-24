# test_mysql.py
import pymysql
import os

def test_mysql_connection():
    """MySQL 연결 테스트 - 최적화된 설정"""
    
    # Docker 환경 체크
    is_docker = os.environ.get('IS_DOCKER', 'false').lower() == 'true'
    
    if is_docker:
        host = 'mysql'  # Docker 컨테이너 이름
        print("Docker 환경에서 MySQL 연결 테스트 중...")
    else:
        host = '192.168.123.104'  # Docker 호스트 IP
        print("로컬 환경에서 MySQL 연결 테스트 중...")
    
    # 최적화된 연결 설정
    connection_configs = [
        {
            'host': host,
            'port': 3306,
            'user': 'livon',
            'password': 'dks12345',
            'database': 'today_todo',
            'connect_timeout': 30,          # 타임아웃 증가
            'read_timeout': 30,
            'write_timeout': 30,
            'charset': 'utf8mb4',
            'autocommit': True,             # 자동 커밋 활성화
            'use_unicode': True,
            'sql_mode': 'TRADITIONAL'
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
            'connect_timeout': 30,
            'read_timeout': 30,
            'write_timeout': 30,
            'charset': 'utf8mb4',
            'autocommit': True,
            'use_unicode': True,
            'sql_mode': 'TRADITIONAL'
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
                
                # 연결 정보 확인
                cursor.execute("SELECT CONNECTION_ID()")
                conn_id = cursor.fetchone()
                print(f"연결 ID: {conn_id}")
                
                # 문자셋 확인
                cursor.execute("SHOW VARIABLES LIKE 'character_set_database'")
                charset_result = cursor.fetchone()
                print(f"데이터베이스 문자셋: {charset_result}")
                
                # 테이블 목록 확인
                cursor.execute("SHOW TABLES")
                tables = cursor.fetchall()
                print(f"테이블 목록: {[table[0] for table in tables]}")
                
                # user 테이블이 있는 경우 데이터 확인
                if any('user' in str(table) for table in tables):
                    cursor.execute("SELECT COUNT(*) as user_count FROM user")
                    user_count = cursor.fetchone()
                    print(f"사용자 수: {user_count[0]}")
                    
                    # 최근 사용자 확인
                    cursor.execute("SELECT username, created_at FROM user ORDER BY created_at DESC LIMIT 3")
                    recent_users = cursor.fetchall()
                    print(f"최근 사용자: {recent_users}")
                
                # todo 테이블 확인
                if any('todo' in str(table) for table in tables):
                    cursor.execute("SELECT COUNT(*) as todo_count FROM todo")
                    todo_count = cursor.fetchone()
                    print(f"할 일 수: {todo_count[0]}")
            
            connection.close()
            print(f"연결 종료 완료")
            return True
            
        except pymysql.Error as e:
            print(f"❌ MySQL 연결 실패 ({config['host']}): {e}")
            print(f"MySQL 오류 코드: {e.args[0] if e.args else 'Unknown'}")
            continue
        except Exception as e:
            print(f"❌ 일반 오류 ({config['host']}): {e}")
            print(f"오류 타입: {type(e).__name__}")
            continue
    
    return False

if __name__ == "__main__":
    print("🔍 MySQL 연결 테스트 시작...")
    print("=" * 50)
    
    success = test_mysql_connection()
    
    print("=" * 50)
    if success:
        print("🎉 MySQL 연결 테스트 성공!")
        print("✅ HeidiSQL과 동일한 설정으로 연결되었습니다.")
    else:
        print("💥 모든 MySQL 연결 테스트 실패!")
        print("\n🔧 해결 방법:")
        print("1. HeidiSQL 연결 설정 확인")
        print("2. Docker 컨테이너 상태: docker ps")
        print("3. MySQL 로그 확인: docker logs mysql")
        print("4. 포트 확인: netstat -tlnp | grep 3306")
        print("5. 방화벽 설정 확인: sudo ufw status")