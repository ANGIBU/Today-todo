# /home/livon/docker/init-scripts/01-init-db.sql
-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS today_talk;
CREATE DATABASE IF NOT EXISTS today_todo;

-- 권한 설정
GRANT ALL PRIVILEGES ON today_talk.* TO 'livon'@'%';
GRANT ALL PRIVILEGES ON today_todo.* TO 'livon'@'%';
FLUSH PRIVILEGES;

-- today_talk 데이터베이스 설정은 그대로 유지
USE today_talk;

-- followers 테이블 생성
CREATE TABLE IF NOT EXISTS followers (
    follower_id INT,
    followed_id INT,
    PRIMARY KEY (follower_id, followed_id)
);

-- user 테이블 생성
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(128),
    nickname VARCHAR(64),
    bio VARCHAR(200),
    profile_image VARCHAR(200) DEFAULT 'default.jpg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- category 테이블 생성
CREATE TABLE IF NOT EXISTS category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#3498db',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- todo 테이블 생성
CREATE TABLE IF NOT EXISTS todo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    date DATETIME NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    category_id INT,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (category_id) REFERENCES category(id)
);

-- notification 테이블 생성
CREATE TABLE IF NOT EXISTS notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(200) NOT NULL,
    type VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    sender_id INT,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (sender_id) REFERENCES user(id)
);

-- news 테이블 생성
CREATE TABLE IF NOT EXISTS news (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    category VARCHAR(50),
    url VARCHAR(512),
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    image_url VARCHAR(512),
    image_path VARCHAR(512),
    thumbnail_path VARCHAR(512),
    images JSON,
    author VARCHAR(100),
    author_email VARCHAR(150),
    source_id VARCHAR(128),
    is_deleted BOOLEAN DEFAULT FALSE,
    INDEX idx_category (category),
    INDEX idx_published_at (published_at),
    INDEX idx_source_id (source_id)
);

-- today_todo 데이터베이스 설정
USE today_todo;

-- user 테이블 생성
CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    nickname VARCHAR(64),
    bio VARCHAR(200),
    profile_image VARCHAR(200) DEFAULT 'default.jpg',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
);

-- 기본 사용자 추가 (비밀번호: password123)
INSERT INTO user (username, email, password_hash, nickname) VALUES
('default_user', 'default@example.com', 'pbkdf2:sha256:150000$LHrIUGlx$8e32ab8427e05153a9e932968c5a89a510946e2d930fe9d6ea289d6fd166397e', '기본 사용자');

-- category 테이블 생성
CREATE TABLE IF NOT EXISTS category (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#3498db',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- 기본 카테고리 추가
INSERT INTO category (name, color, user_id) VALUES 
('업무', '#3498db', 1),
('개인', '#2ecc71', 1),
('중요', '#e74c3c', 1);

-- todo 테이블 생성
CREATE TABLE IF NOT EXISTS todo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    date DATETIME NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_id INT,
    category_id INT,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (category_id) REFERENCES category(id)
);

-- followers 테이블 생성
CREATE TABLE IF NOT EXISTS followers (
    follower_id INT,
    followed_id INT,
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES user(id),
    FOREIGN KEY (followed_id) REFERENCES user(id)
);

-- notification 테이블 생성
CREATE TABLE IF NOT EXISTS notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(200) NOT NULL,
    type VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INT NOT NULL,
    sender_id INT,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (sender_id) REFERENCES user(id)
);

-- 샘플 할 일 데이터 추가
INSERT INTO todo (title, description, date, user_id, category_id) VALUES
('예제 할 일', '이것은 예제 할 일입니다.', NOW(), 1, 1),
('프로젝트 완료하기', '서버 구축 프로젝트 마무리', DATE_ADD(NOW(), INTERVAL 3 DAY), 1, 1),
('운동하기', '30분 조깅', DATE_ADD(NOW(), INTERVAL 1 DAY), 1, 2);