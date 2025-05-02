# models.py
from extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# 팔로우 관계를 나타내는 연결 테이블
followers = db.Table('followers',
    db.Column('follower_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('followed_id', db.Integer, db.ForeignKey('user.id'))
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True)
    email = db.Column(db.String(120), index=True, unique=True)
    password_hash = db.Column(db.String(128))
    nickname = db.Column(db.String(64))
    bio = db.Column(db.String(200))
    profile_image = db.Column(db.String(200), default='default.jpg')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    todos = db.relationship('Todo', backref='user', lazy='dynamic')
    categories = db.relationship('Category', backref='user', lazy='dynamic')
    
    # 알림 관계 수정 - foreign_keys 명시적 지정
    notifications = db.relationship('Notification', 
                                  foreign_keys='Notification.user_id',
                                  backref='user', lazy='dynamic')
    
    # 팔로워/팔로잉 관계 설정
    followed = db.relationship(
        'User', secondary=followers,
        primaryjoin=(followers.c.follower_id == id),
        secondaryjoin=(followers.c.followed_id == id),
        backref=db.backref('followers', lazy='dynamic'), lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def follow(self, user):
        if not self.is_following(user):
            self.followed.append(user)
            return self
            
    def unfollow(self, user):
        if self.is_following(user):
            self.followed.remove(user)
            return self
            
    def is_following(self, user):
        return self.followed.filter(followers.c.followed_id == user.id).count() > 0
        
    def followed_todos(self):
        return Todo.query.join(
            followers, (followers.c.followed_id == Todo.user_id)
        ).filter(
            followers.c.follower_id == self.id,
            Todo.is_public == True
        ).order_by(Todo.created_at.desc())

class Todo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(500))
    date = db.Column(db.DateTime, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    pinned = db.Column(db.Boolean, default=False)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 외래 키
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), default='#3498db')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래 키
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # 관계 설정
    todos = db.relationship('Todo', backref='category', lazy='dynamic')

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(20)) # follow, like, mention 등
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래 키
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # 알림 보낸 사용자와의 관계 명시적 설정
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_notifications')