# app/models.py
from app.extensions import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

# 팔로우 관계를 나타내는 연결 테이블
followers = db.Table('followers',
    db.Column('follower_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('followed_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), index=True, unique=True, nullable=False)
    email = db.Column(db.String(120), index=True, unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    nickname = db.Column(db.String(64), nullable=False)
    bio = db.Column(db.String(200))
    profile_image = db.Column(db.String(200), default='default.jpg')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    todos = db.relationship('Todo', foreign_keys='Todo.user_id', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    categories = db.relationship('Category', foreign_keys='Category.user_id', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    
    # 알림 관계 수정 - foreign_keys 명시적 지정
    notifications = db.relationship('Notification', 
                                  foreign_keys='Notification.user_id',
                                  backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')
    
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
        
    def to_dict(self):
        """사용자 정보를 딕셔너리로 반환"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'nickname': self.nickname,
            'bio': self.bio,
            'profile_image': self.profile_image,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'followers_count': self.followers.count(),
            'following_count': self.followed.count()
        }

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
    
    # 외래 키 - anonymous_id 필드 제거
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('category.id'))
    
    def to_dict(self):
        """할 일 정보를 딕셔너리로 반환"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'date': self.date.strftime('%Y-%m-%d'),
            'completed': self.completed,
            'pinned': self.pinned,
            'category_id': self.category_id,
            'is_public': self.is_public,
            'user_id': self.user_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        
    @staticmethod
    def from_dict(data, user_id=None, anonymous_id=None):
        """딕셔너리에서 할 일 객체 생성"""
        date = datetime.strptime(data['date'], '%Y-%m-%d') if isinstance(data['date'], str) else data['date']
        todo = Todo(
            title=data['title'],
            description=data.get('description', ''),
            date=date,
            completed=data.get('completed', False),
            pinned=data.get('pinned', False),
            is_public=data.get('is_public', False),
            category_id=data.get('category_id')
        )
        
        # anonymous_id 관련 로직 제거, user_id만 설정
        if user_id:
            todo.user_id = user_id
            
        return todo

class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), default='#3498db')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래 키 - anonymous_id 필드 제거
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    
    # 관계 설정
    todos = db.relationship('Todo', backref='category', lazy='dynamic')
    
    def to_dict(self):
        """카테고리 정보를 딕셔너리로 반환"""
        return {
            'id': self.id,
            'name': self.name,
            'color': self.color,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    @staticmethod
    def from_dict(data, user_id=None, anonymous_id=None):
        """딕셔너리에서 카테고리 객체 생성"""
        category = Category(
            name=data['name'],
            color=data.get('color', '#3498db')
        )
        
        # anonymous_id 관련 로직 제거, user_id만 설정
        if user_id:
            category.user_id = user_id
            
        return category

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(20))  # follow, like, mention 등
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 외래 키
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    
    # 알림 보낸 사용자와의 관계 명시적 설정
    sender = db.relationship('User', foreign_keys=[sender_id], 
                            backref=db.backref('sent_notifications', lazy='dynamic'))
    
    def to_dict(self):
        """알림 정보를 딕셔너리로 반환"""
        data = {
            'id': self.id,
            'message': self.message,
            'type': self.type,
            'read': self.read,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
            'sender': None
        }
        
        if self.sender:
            data['sender'] = {
                'id': self.sender.id,
                'username': self.sender.username,
                'nickname': self.sender.nickname,
                'profile_image': self.sender.profile_image
            }
            
        return data