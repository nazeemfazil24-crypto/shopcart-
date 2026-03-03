"""
SQLAlchemy models for ShopHub — Users, Products, Orders, Payments.
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(200), unique=True, nullable=False, index=True)
    username = db.Column(db.String(150), nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False, default='user')  # admin | seller | user
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Email verification fields
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(500), nullable=True)
    email_verification_expires = db.Column(db.DateTime, nullable=True)
    
    # Google OAuth fields
    oauth_google_id = db.Column(db.String(500), nullable=True, unique=True)
    
    # Account deletion fields
    account_deletion_pending = db.Column(db.Boolean, default=False)
    account_deletion_date = db.Column(db.DateTime, nullable=True)  # When deletion will occur
    account_deletion_otp = db.Column(db.String(200), nullable=True)
    account_deletion_otp_expires = db.Column(db.DateTime, nullable=True)

    # Relationship: seller owns products
    products = db.relationship('Product', backref='seller', lazy=True)

    def to_dict(self):
        d = {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'role': self.role,
            'email_verified': self.email_verified,
            'oauth_google_id': self.oauth_google_id,
            'account_deletion_pending': self.account_deletion_pending,
            'account_deletion_date': self.account_deletion_date.isoformat() if self.account_deletion_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        return d


class Product(db.Model):
    __tablename__ = 'products'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    price = db.Column(db.Float, nullable=False, default=0.0)
    description = db.Column(db.Text, default='')
    category = db.Column(db.String(100), default='')
    category_name = db.Column(db.String(100), default='')
    image = db.Column(db.String(400), default='')
    rating = db.Column(db.Float, default=4.0)
    reviews = db.Column(db.Integer, default=0)
    seller_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'description': self.description,
            'category': self.category,
            'category_name': self.category_name,
            'image': self.image,
            'rating': self.rating,
            'reviews': self.reviews,
            'seller_id': self.seller_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(100), unique=True, nullable=False)
    user_email = db.Column(db.String(200), default='')
    items_json = db.Column(db.Text, default='[]')
    total = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(50), default='Completed')
    method = db.Column(db.String(100), default='online')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        import json
        return {
            'id': self.order_id,
            'user': self.user_email,
            'items': json.loads(self.items_json) if self.items_json else [],
            'total': self.total,
            'status': self.status,
            'method': self.method,
            'date': self.created_at.isoformat() if self.created_at else None
        }


class Payment(db.Model):
    __tablename__ = 'payments'

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.String(100), unique=True, nullable=False)
    user_email = db.Column(db.String(200), default='')
    amount = db.Column(db.Float, default=0.0)
    method = db.Column(db.String(100), default='online')
    status = db.Column(db.String(50), default='Completed')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.payment_id,
            'user': self.user_email,
            'amount': self.amount,
            'method': self.method,
            'status': self.status,
            'date': self.created_at.isoformat() if self.created_at else None
        }
