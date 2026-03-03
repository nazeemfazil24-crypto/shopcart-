from flask import Flask, request, jsonify, send_from_directory, redirect, url_for, session
import os
import smtplib
import ssl
from email.message import EmailMessage
import uuid
import json
from datetime import datetime, timedelta, timezone
import requests as http_requests
import pyotp
import qrcode
from io import BytesIO
import base64
import random
import string

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token,
    jwt_required, get_jwt_identity, get_jwt
)

from models import db, User, Product, Order, Payment

app = Flask(__name__, static_folder='.')

# ── Configuration ────────────────────────────────────────────────────
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'shophub-secret-change-in-production')
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-shophub-secret-change-me')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=7)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///shophub.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)

# ── Extensions ───────────────────────────────────────────────────────
db.init_app(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ── Email config (EmailJS) ────────────────────────────────────────────
EMAILJS_PUBLIC_KEY = os.environ.get('EMAILJS_PUBLIC_KEY', 'cEntSOV7xlLbIsv_7')
EMAILJS_PRIVATE_KEY = os.environ.get('EMAILJS_PRIVATE_KEY', 'KW19VgkvxkfKwGJUB4ws5')
EMAILJS_SERVICE_ID = os.environ.get('EMAILJS_SERVICE_ID', 'service_k480zx6')
EMAILJS_TEMPLATE_ID = os.environ.get('EMAILJS_TEMPLATE_ID', 'template_gvz3hbt')
FROM_EMAIL = os.environ.get('FROM_EMAIL', 'onlineshoppingandbillingsuppor@gmail.com')

# ── SMTP fallback (optional) ─────────────────────────────────────────
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASS = os.environ.get('SMTP_PASS')

# ── Google OAuth config ──────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '590513627756-s8k52kdq5vqqqthbt4grb8v07cpv1i0b.apps.googleusercontent.com')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

TWILIO_SID = os.environ.get('TWILIO_SID')
TWILIO_TOKEN = os.environ.get('TWILIO_TOKEN')
TWILIO_FROM = os.environ.get('TWILIO_FROM')
DEV_MODE = os.environ.get('DEV_MODE', 'false').lower() in ('1', 'true', 'yes')

MENU_FILE = 'menu.json'
PAYMENTS_FILE = 'payment_history.json'
ORDERS_FILE = 'order_history.json'
VERIFIED_FILE = 'verified_emails.json'


# ═══════════════════════════════════════════════════════════════════════
#  UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
PENDING_TOKENS_FILE = os.path.join(BASE_DIR, 'pending_tokens.json')

def read_json(path, default=None):
    if not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def ensure_upload_dir():
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR, exist_ok=True)

def require_role(*roles):
    """Decorator factory: require that the JWT user has one of the given roles."""
    from functools import wraps
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role', 'user')
            if user_role not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def send_email(to_email, subject, body, html_body=None, **extra_params):
    """Send email using EmailJS REST API (primary) or SMTP (fallback).
    
    extra_params: additional template variables like otp='123456'
    """
    # Try EmailJS first
    if EMAILJS_PUBLIC_KEY and EMAILJS_SERVICE_ID and EMAILJS_TEMPLATE_ID:
        try:
            template_params = {
                'to_email': to_email,
                'email': to_email,
                'user_email': to_email,
                'reply_to': to_email,
                'to_name': to_email.split('@')[0],
                'subject': subject,
                'message': html_body or body,
                'message_html': html_body or body,
                'from_name': 'ShopHub',
                'from_email': FROM_EMAIL
            }
            # Merge extra params (e.g. otp, otp_code)
            template_params.update(extra_params)
            
            payload = {
                'service_id': EMAILJS_SERVICE_ID,
                'template_id': EMAILJS_TEMPLATE_ID,
                'user_id': EMAILJS_PUBLIC_KEY,
                'accessToken': EMAILJS_PRIVATE_KEY,
                'template_params': template_params
            }
            resp = http_requests.post(
                'https://api.emailjs.com/api/v1.0/email/send',
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Origin': 'http://localhost',
                    'User-Agent': 'Mozilla/5.0'
                },
                timeout=15
            )
            if resp.status_code == 200:
                app.logger.info(f'EmailJS: sent to {to_email}')
                return True
            else:
                app.logger.error(f'EmailJS failed ({resp.status_code}): {resp.text}')
        except Exception as e:
            app.logger.exception(f'EmailJS error: {str(e)}')

    # Fallback to SMTP
    if SMTP_USER and SMTP_PASS:
        try:
            msg = EmailMessage()
            msg['Subject'] = subject
            msg['From'] = FROM_EMAIL
            msg['To'] = to_email
            if html_body:
                msg.add_alternative(html_body, subtype='html')
            else:
                msg.set_content(body)
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            app.logger.info(f'SMTP: sent to {to_email}')
            return True
        except Exception as e:
            app.logger.exception(f'SMTP failed: {str(e)}')
            return False

    app.logger.error('No email provider configured (neither EmailJS nor SMTP)')
    return False


def generate_otp(length=6):
    """Generate a random OTP."""
    return ''.join(random.choices(string.digits, k=length))


def generate_verification_token():
    """Generate a unique verification token."""
    return str(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════════
#  AUTH API  —  Register / Login / Me
# ═══════════════════════════════════════════════════════════════════════

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    username = (data.get('username') or '').strip()
    password = data.get('password', '')
    role = 'user'  # Everyone registers as a buyer; upgrade to seller later

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if not username:
        username = email.split('@')[0]

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    pw_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    # Generate 6-digit OTP for email verification
    otp = generate_otp(6)
    otp_hash = bcrypt.generate_password_hash(otp).decode('utf-8')
    otp_expires = datetime.utcnow() + timedelta(minutes=15)
    
    user = User(
        email=email, 
        username=username, 
        password_hash=pw_hash, 
        role=role,
        email_verified=False,
        email_verification_token=otp_hash,
        email_verification_expires=otp_expires
    )
    db.session.add(user)
    db.session.commit()

    # Send verification OTP email
    email_body = f"""
Welcome to ShopHub!

Your email verification code is: {otp}

This code expires in 15 minutes.

If you didn't create this account, please ignore this email.

Best regards,
ShopHub Team
"""
    
    email_html = f"""
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #63c882;">Welcome to ShopHub!</h1>
        <p style="color: #333; font-size: 16px;">Please verify your email address using the code below:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #63c882; margin: 20px 0;">
            <p style="color: #333; font-size: 14px; margin: 0;">Your verification code is:</p>
            <p style="color: #63c882; font-size: 32px; font-weight: bold; margin: 10px 0; letter-spacing: 8px;">{otp}</p>
            <p style="color: #999; font-size: 12px; margin: 0;">This code expires in 15 minutes.</p>
        </div>
        <p style="color: #999; font-size: 14px;">If you didn't create this account, please ignore this email.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">&copy; 2024 ShopHub. All rights reserved.</p>
    </div>
</body>
</html>
"""

    email_sent = send_email(email, 'ShopHub — Your Verification Code', email_body, email_html, otp=otp, otp_code=otp, passcode=otp)
    
    app.logger.info(f'Registration OTP for {email}: {otp}')

    return jsonify({
        'success': True, 
        'message': 'Account created! Please enter the verification code.',
        'email': email,
        'otp_code': otp,
        'user': user.to_dict()
    }), 201


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    # Check if email is verified
    if not user.email_verified:
        return jsonify({
            'success': False,
            'error': 'Please verify your email to login',
            'email_verified': False,
            'message': 'A verification link has been sent to your email'
        }), 403

    # Check if account is scheduled for deletion
    if user.account_deletion_pending:
        if user.account_deletion_date and datetime.utcnow() > user.account_deletion_date:
            # Delete the account
            db.session.delete(user)
            db.session.commit()
            return jsonify({'error': 'Account has been deleted'}), 410
        else:
            return jsonify({'error': 'Your account is scheduled for deletion'}), 403

    # Create JWT with role in additional claims
    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'email': user.email, 'username': user.username}
    )
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })


@app.route('/api/me', methods=['GET'])
@jwt_required()
def api_me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': user.to_dict()})


@app.route('/api/verify-registration-otp', methods=['POST'])
def api_verify_registration_otp():
    """Verify registration email using OTP code."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.email_verified:
        return jsonify({'error': 'Email already verified'}), 400

    if not user.email_verification_token:
        return jsonify({'error': 'No verification pending. Please request a new code.'}), 400

    if user.email_verification_expires and datetime.utcnow() > user.email_verification_expires:
        return jsonify({'error': 'Verification code has expired. Please request a new one.'}), 400

    if not bcrypt.check_password_hash(user.email_verification_token, otp):
        return jsonify({'error': 'Invalid verification code'}), 400

    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Email verified successfully! You can now login.',
        'user': user.to_dict()
    })


@app.route('/api/verify-email', methods=['GET'])
def api_verify_email():
    """Legacy: verify email using token from link (redirects to login)."""
    token = request.args.get('token')
    if not token:
        return jsonify({'error': 'No verification token provided'}), 400
    # Legacy link-based tokens are no longer generated; return a helpful message
    return jsonify({
        'error': 'Link-based verification is no longer supported. Please use the OTP code sent to your email.',
        'redirect': '/login.html'
    }), 400


@app.route('/api/resend-verification-email', methods=['POST'])
def api_resend_verification_email():
    """Resend verification OTP code."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.email_verified:
        return jsonify({'error': 'Email already verified'}), 400

    # Generate new OTP
    otp = generate_otp(6)
    otp_hash = bcrypt.generate_password_hash(otp).decode('utf-8')
    otp_expires = datetime.utcnow() + timedelta(minutes=15)
    user.email_verification_token = otp_hash
    user.email_verification_expires = otp_expires
    db.session.commit()

    email_body = f"""
Your new ShopHub verification code is: {otp}

This code expires in 15 minutes.

ShopHub Team
"""
    
    email_html = f"""
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #63c882;">Verification Code</h1>
        <p style="color: #333; font-size: 16px;">Here is your new verification code:</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #63c882; margin: 20px 0;">
            <p style="color: #63c882; font-size: 32px; font-weight: bold; margin: 10px 0; letter-spacing: 8px;">{otp}</p>
            <p style="color: #999; font-size: 12px; margin: 0;">This code expires in 15 minutes.</p>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">&copy; 2024 ShopHub. All rights reserved.</p>
    </div>
</body>
</html>
"""

    email_sent = send_email(email, 'ShopHub — Your New Verification Code', email_body, email_html, otp=otp, otp_code=otp, passcode=otp)
    
    app.logger.info(f'Resend OTP for {email}: {otp}')

    return jsonify({
        'success': True,
        'message': 'A new verification code has been sent to your email',
        'otp_code': otp
    })


# ── Login OTP storage (in-memory) ─────────────────────────────────────
login_otp_store = {}  # {email: {otp_hash, expires, attempts}}

@app.route('/api/send-login-otp', methods=['POST'])
def api_send_login_otp():
    """Generate and send OTP for login verification (used by otp7.html)."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password'}), 401

    otp = generate_otp(6)
    otp_hash = bcrypt.generate_password_hash(otp).decode('utf-8')
    login_otp_store[email] = {
        'otp_hash': otp_hash,
        'expires': datetime.utcnow() + timedelta(minutes=10),
        'attempts': 0
    }

    email_body = f'Your ShopHub login OTP is: {otp}\nThis code expires in 10 minutes.'
    email_html = f'''
<html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
<div style="max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:10px">
<h1 style="color:#63c882">Login Verification</h1>
<p>Your one-time password is:</p>
<div style="background:#f9f9f9;padding:15px;border-left:4px solid #63c882;margin:20px 0">
<p style="color:#63c882;font-size:32px;font-weight:bold;letter-spacing:8px;margin:0">{otp}</p>
</div>
<p style="color:#999;font-size:12px">This code expires in 10 minutes.</p>
</div></body></html>
'''
    send_email(email, 'ShopHub — Login OTP', email_body, email_html, otp=otp, otp_code=otp, passcode=otp)
    app.logger.info(f'Login OTP for {email}: {otp}')

    return jsonify({
        'success': True,
        'message': 'OTP sent',
        'otp_code': otp
    })


@app.route('/api/verify-login-otp', methods=['POST'])
def api_verify_login_otp():
    """Verify login OTP and return JWT token."""
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    otp = (data.get('otp') or '').strip()

    if not email or not otp:
        return jsonify({'error': 'Email and OTP are required'}), 400

    stored = login_otp_store.get(email)
    if not stored:
        return jsonify({'error': 'No OTP requested. Please request a new one.'}), 400

    if datetime.utcnow() > stored['expires']:
        del login_otp_store[email]
        return jsonify({'error': 'OTP expired. Please request a new one.'}), 400

    stored['attempts'] += 1
    if stored['attempts'] > 5:
        del login_otp_store[email]
        return jsonify({'error': 'Too many attempts. Please request a new OTP.'}), 429

    if not bcrypt.check_password_hash(stored['otp_hash'], otp):
        return jsonify({'error': 'Invalid OTP'}), 400

    del login_otp_store[email]

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'email': user.email, 'username': user.username}
    )
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })


@app.route('/api/auth/google', methods=['POST'])
def api_auth_google():
    """Handle Google OAuth login/registration with server-side token verification."""
    data = request.get_json() or {}
    credential = data.get('credential') or data.get('token')

    if not credential:
        return jsonify({'error': 'No Google credential provided'}), 400

    # Server-side verification of Google ID token
    google_id = None
    email = None
    name = None

    if GOOGLE_AUTH_AVAILABLE and GOOGLE_CLIENT_ID:
        try:
            idinfo = google_id_token.verify_oauth2_token(
                credential, google_requests.Request(), GOOGLE_CLIENT_ID
            )
            google_id = idinfo.get('sub')
            email = idinfo.get('email', '').lower().strip()
            name = idinfo.get('name', '')
        except Exception as e:
            app.logger.error(f'Google token verification failed: {e}')
            return jsonify({'error': 'Invalid Google token'}), 401
    else:
        # Fallback: decode JWT payload directly (less secure, for dev)
        try:
            parts = credential.split('.')
            padded = parts[1] + '=' * (4 - len(parts[1]) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded))
            google_id = data.get('id') or payload.get('sub')
            email = (data.get('email') or payload.get('email', '')).lower().strip()
            name = data.get('name') or payload.get('name', '')
        except Exception:
            google_id = data.get('id')
            email = (data.get('email') or '').lower().strip()
            name = data.get('name', '')

    if not google_id or not email:
        return jsonify({'error': 'Invalid Google token data'}), 400

    # Check if user exists with this Google ID
    user = User.query.filter_by(oauth_google_id=google_id).first()
    
    if not user:
        # Check if email already exists
        user = User.query.filter_by(email=email).first()
        if user:
            # Link existing account to Google OAuth
            user.oauth_google_id = google_id
            user.email_verified = True  # Google-verified email
        else:
            # Create new user
            username = name.split()[0] if name else email.split('@')[0]
            user = User(
                email=email,
                username=username,
                password_hash=bcrypt.generate_password_hash('google-oauth-' + google_id).decode('utf-8'),
                role='user',
                email_verified=True,  # Google email is pre-verified
                oauth_google_id=google_id
            )
        db.session.add(user)
        db.session.commit()

    # Check if account is scheduled for deletion
    if user.account_deletion_pending:
        if user.account_deletion_date and datetime.utcnow() > user.account_deletion_date:
            db.session.delete(user)
            db.session.commit()
            return jsonify({'error': 'Account has been deleted'}), 410
        else:
            return jsonify({'error': 'Your account is scheduled for deletion'}), 403

    # Create JWT token
    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'email': user.email, 'username': user.username}
    )

    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })


@app.route('/api/config', methods=['GET'])
def api_config():
    """Return public configuration (Google Client ID, etc.)."""
    return jsonify({
        'google_client_id': GOOGLE_CLIENT_ID or '',
        'dev_mode': DEV_MODE
    })


@app.route('/api/request-account-deletion', methods=['POST'])
@jwt_required()
def api_request_account_deletion():
    """Start the 30-day account deletion process."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.account_deletion_pending:
        return jsonify({'error': 'Account deletion is already pending'}), 400

    # Generate OTP for verification
    otp = generate_otp()
    otp_hash = bcrypt.generate_password_hash(otp).decode('utf-8')
    otp_expires = datetime.utcnow() + timedelta(minutes=10)

    user.account_deletion_otp = otp_hash
    user.account_deletion_otp_expires = otp_expires
    user.account_deletion_pending = True
    user.account_deletion_date = datetime.utcnow() + timedelta(days=30)
    db.session.commit()

    # Send OTP email
    email_body = f"""
Account Deletion Request

Your account deletion has been initiated. You have 30 days to verify and complete the deletion.

Your verification code is: {otp}
This code expires in 10 minutes.

To confirm the deletion, please reply with this code.

If you did not request this, please contact support immediately.

ShopHub Team
"""

    email_html = f"""
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #d9534f;">Account Deletion Request</h1>
        <p style="color: #333; font-size: 16px;">Your account deletion has been initiated.</p>
        <p style="color: #333; font-size: 16px;">You have <strong>30 days</strong> to verify and complete the deletion.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 20px 0;">
            <p style="color: #333; font-size: 14px; margin: 0;">Your verification code is:</p>
            <p style="color: #d9534f; font-size: 24px; font-weight: bold; margin: 10px 0;">{otp}</p>
            <p style="color: #999; font-size: 12px; margin: 0;">This code expires in 10 minutes.</p>
        </div>
        <p style="color: #999; font-size: 14px;">If you did not request this, please contact support immediately.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">© 2024 ShopHub. All rights reserved.</p>
    </div>
</body>
</html>
"""

    send_email(user.email, 'ShopHub — Account Deletion Request', email_body, email_html, otp=otp, otp_code=otp)

    deletion_date = user.account_deletion_date.isoformat() if user.account_deletion_date else None
    return jsonify({
        'success': True,
        'message': f'Account deletion initiated. You have 30 days to verify. Deletion date: {deletion_date}',
        'deletion_date': deletion_date
    })


@app.route('/api/verify-deletion-otp', methods=['POST'])
@jwt_required()
def api_verify_deletion_otp():
    """Verify OTP for account deletion."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.account_deletion_pending:
        return jsonify({'error': 'No deletion request pending'}), 400

    data = request.get_json() or {}
    otp = data.get('otp', '')

    if not otp:
        return jsonify({'error': 'OTP is required'}), 400

    if not user.account_deletion_otp_expires or datetime.utcnow() > user.account_deletion_otp_expires:
        return jsonify({'error': 'OTP has expired. Please request a new verification code'}), 400

    if not bcrypt.check_password_hash(user.account_deletion_otp, otp):
        return jsonify({'error': 'Invalid OTP'}), 400

    # OTP verified - account will be deleted after 30 days
    user.account_deletion_otp = None
    user.account_deletion_otp_expires = None
    db.session.commit()

    deletion_date = user.account_deletion_date.isoformat() if user.account_deletion_date else None
    return jsonify({
        'success': True,
        'message': f'Account deletion verified. Your account will be deleted on {deletion_date}',
        'deletion_date': deletion_date
    })


@app.route('/api/cancel-account-deletion', methods=['POST'])
@jwt_required()
def api_cancel_account_deletion():
    """Cancel account deletion within 30-day period."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.account_deletion_pending:
        return jsonify({'error': 'No deletion scheduled'}), 400

    # Cancel deletion
    user.account_deletion_pending = False
    user.account_deletion_date = None
    user.account_deletion_otp = None
    user.account_deletion_otp_expires = None
    db.session.commit()

    # Send confirmation email
    email_body = """
Your account deletion has been cancelled.

Your account is now active again.

If you have questions, please contact support.

ShopHub Team
"""

    email_html = """
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #63c882;">Account Deletion Cancelled</h1>
        <p style="color: #333; font-size: 16px;">Your account deletion has been cancelled successfully.</p>
        <p style="color: #333; font-size: 16px;">Your account is now active again.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">© 2024 ShopHub. All rights reserved.</p>
    </div>
</body>
</html>
"""

    send_email(user.email, 'ShopHub — Account Deletion Cancelled', email_body, email_html)

    return jsonify({
        'success': True,
        'message': 'Account deletion cancelled. Your account is now active',
        'user': user.to_dict()
    })


@app.route('/api/delete-account', methods=['POST'])
@jwt_required()
def api_delete_account():
    """Immediately delete the account (after confirmed deletion period)."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.account_deletion_pending or not user.account_deletion_date:
        return jsonify({'error': 'Account deletion was not initiated'}), 400

    if datetime.utcnow() < user.account_deletion_date:
        remaining_days = (user.account_deletion_date - datetime.utcnow()).days
        return jsonify({
            'error': f'Account cannot be deleted yet. Please wait {remaining_days} more days',
            'deletion_date': user.account_deletion_date.isoformat()
        }), 403

    # Send final email before deletion
    email_body = """
Your ShopHub account has been permanently deleted.

All your data has been removed from our servers.

Thank you for using ShopHub!

ShopHub Team
"""

    email_html = """
<html>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <h1 style="color: #555;">Account Deleted</h1>
        <p style="color: #333; font-size: 16px;">Your ShopHub account has been permanently deleted.</p>
        <p style="color: #333; font-size: 16px;">All your data has been removed from our servers.</p>
        <p style="color: #999; font-size: 14px;">Thank you for using ShopHub!</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">© 2024 ShopHub. All rights reserved.</p>
    </div>
</body>
</html>
"""

    send_email(user.email, 'ShopHub — Account Permanently Deleted', email_body, email_html)

    # Delete user
    db.session.delete(user)
    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Account has been permanently deleted'
    })


@app.route('/api/upgrade-to-seller', methods=['POST'])
@jwt_required()
def api_upgrade_to_seller():
    """Upgrade a user account to seller. Requires seller details."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if user.role == 'seller':
        return jsonify({'error': 'Already a seller'}), 400
    if user.role == 'admin':
        return jsonify({'error': 'Admin accounts cannot be converted'}), 400

    data = request.get_json() or {}
    shop_name = (data.get('shop_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    description = (data.get('description') or '').strip()

    if not shop_name:
        return jsonify({'error': 'Shop name is required'}), 400
    if not phone:
        return jsonify({'error': 'Contact phone is required'}), 400

    user.role = 'seller'
    db.session.commit()

    # Return new token with updated role
    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role, 'email': user.email, 'username': user.username}
    )
    return jsonify({
        'success': True,
        'message': 'Account upgraded to seller!',
        'token': token,
        'user': user.to_dict()
    })


# ═══════════════════════════════════════════════════════════════════════
#  SELLER API  —  Add / List / Delete products
# ═══════════════════════════════════════════════════════════════════════

@app.route('/api/seller/products', methods=['GET'])
@require_role('seller', 'admin')
def seller_list_products():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    if claims.get('role') == 'admin':
        products = Product.query.all()
    else:
        products = Product.query.filter_by(seller_id=user_id).all()
    return jsonify({'products': [p.to_dict() for p in products]})


@app.route('/api/seller/products', methods=['POST'])
@require_role('seller', 'admin')
def seller_add_product():
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    price = data.get('price', 0)
    description = (data.get('description') or '').strip()
    category = (data.get('category') or '').strip()
    category_name = (data.get('category_name') or category).strip()
    image = (data.get('image') or '').strip()

    if not name:
        return jsonify({'error': 'Product name is required'}), 400
    try:
        price = float(price)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid price'}), 400

    product = Product(
        name=name, price=price, description=description,
        category=category, category_name=category_name,
        image=image, seller_id=user_id
    )
    db.session.add(product)
    db.session.commit()

    return jsonify({'success': True, 'product': product.to_dict()}), 201


@app.route('/api/seller/products/<int:product_id>', methods=['PUT'])
@require_role('seller', 'admin')
def seller_update_product(product_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    if claims.get('role') != 'admin' and product.seller_id != user_id:
        return jsonify({'error': 'Not your product'}), 403

    data = request.get_json() or {}
    if 'name' in data:
        product.name = data['name'].strip()
    if 'price' in data:
        product.price = float(data['price'])
    if 'description' in data:
        product.description = data['description'].strip()
    if 'category' in data:
        product.category = data['category'].strip()
    if 'category_name' in data:
        product.category_name = data['category_name'].strip()
    if 'image' in data:
        product.image = data['image'].strip()

    db.session.commit()
    return jsonify({'success': True, 'product': product.to_dict()})


@app.route('/api/seller/products/<int:product_id>', methods=['DELETE'])
@require_role('seller', 'admin')
def seller_delete_product(product_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    if claims.get('role') != 'admin' and product.seller_id != user_id:
        return jsonify({'error': 'Not your product'}), 403

    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True})


# ═══════════════════════════════════════════════════════════════════════
#  PUBLIC PRODUCT API  —  For the storefront
# ═══════════════════════════════════════════════════════════════════════

@app.route('/api/products', methods=['GET'])
def api_products():
    """Return all products grouped by category (same structure as menu.json stores)."""
    products = Product.query.all()
    # Group by category_name
    stores_map = {}
    for p in products:
        cat = p.category_name or 'Other'
        if cat not in stores_map:
            stores_map[cat] = {
                'id': f'store_{len(stores_map)+1}',
                'name': cat,
                'category': p.category or cat.lower().replace(' & ', '-').replace(' ', '-'),
                'items': []
            }
        stores_map[cat]['items'].append({
            'id': f'p{p.id}',
            'name': p.name,
            'price': p.price,
            'description': p.description,
            'rating': p.rating,
            'reviews': p.reviews,
            'image': p.image or ''
        })
    return jsonify({'stores': list(stores_map.values())})


# ═══════════════════════════════════════════════════════════════════════
#  ADMIN API  —  Menu / Payments / Orders / Upload (protected)
# ═══════════════════════════════════════════════════════════════════════

@app.route('/admin/menu', methods=['GET', 'POST'])
def admin_menu():
    if request.method == 'GET':
        return send_from_directory('.', MENU_FILE)
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'success': False, 'error': 'No JSON body'}), 400
        write_json(MENU_FILE, data)
        return jsonify({'success': True})
    except Exception as e:
        app.logger.exception('Failed to save menu')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/admin/payments', methods=['GET', 'POST'])
def admin_payments():
    if request.method == 'GET':
        return send_from_directory('.', PAYMENTS_FILE)
    try:
        data = request.get_json()
        write_json(PAYMENTS_FILE, data or [])
        return jsonify({'success': True})
    except Exception as e:
        app.logger.exception('Failed to save payments')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/admin/orders', methods=['GET', 'POST'])
def admin_orders():
    if request.method == 'GET':
        return send_from_directory('.', ORDERS_FILE)
    try:
        data = request.get_json()
        write_json(ORDERS_FILE, data or [])
        return jsonify({'success': True})
    except Exception as e:
        app.logger.exception('Failed to save orders')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/admin/upload_image', methods=['POST'])
def upload_image():
    ensure_upload_dir()
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'}), 400
    f = request.files['file']
    filename = f.filename.replace('..', '')
    target = os.path.join(UPLOAD_DIR, filename)
    try:
        f.save(target)
        return jsonify({'success': True, 'path': f'/{UPLOAD_DIR}/{filename}'})
    except Exception as e:
        app.logger.exception('Failed to save upload')
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════
#  OTP / EMAIL / SMS ROUTES  (kept from original)
# ═══════════════════════════════════════════════════════════════════════

def add_verified_email(email):
    data = read_json(VERIFIED_FILE) or {"verified": []}
    if 'verified' not in data:
        data['verified'] = []
    if email.lower() not in data['verified']:
        data['verified'].append(email.lower())
        write_json(VERIFIED_FILE, data)

def is_email_verified(email):
    data = read_json(VERIFIED_FILE) or {"verified": []}
    return email.lower() in data.get('verified', [])

def add_verified_phone(phone):
    data = read_json(VERIFIED_FILE) or {"verified": []}
    if 'verified' not in data:
        data['verified'] = []
    if phone not in data['verified']:
        data['verified'].append(phone)
        write_json(VERIFIED_FILE, data)

def is_phone_verified(phone):
    data = read_json(VERIFIED_FILE) or {"verified": []}
    return phone in data.get('verified', [])

def send_sms_via_twilio(to_number, body):
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
        raise RuntimeError('Twilio credentials not configured')
    url = f'https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json'
    data = {'From': TWILIO_FROM, 'To': to_number, 'Body': body}
    resp = http_requests.post(url, data=data, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10)
    resp.raise_for_status()
    return resp.json()

def _ensure_whatsapp_prefix(number_or_value):
    if not number_or_value:
        return number_or_value
    return number_or_value if str(number_or_value).startswith('whatsapp:') else f'whatsapp:{number_or_value}'

def send_whatsapp_via_twilio(to_number, body):
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
        raise RuntimeError('Twilio credentials not configured')
    url = f'https://api.twilio.com/2010-04-01/Accounts/{TWILIO_SID}/Messages.json'
    data = {
        'From': _ensure_whatsapp_prefix(TWILIO_FROM),
        'To': _ensure_whatsapp_prefix(to_number),
        'Body': body
    }
    resp = http_requests.post(url, data=data, auth=(TWILIO_SID, TWILIO_TOKEN), timeout=10)
    resp.raise_for_status()
    return resp.json()


@app.route('/send_otp', methods=['POST'])
def send_otp():
    data = request.get_json() or {}
    to_email = data.get('email')
    otp = data.get('otp')
    if not to_email or not otp:
        return jsonify({'success': False, 'error': 'Missing email or otp'}), 400
    if not SMTP_USER or not SMTP_PASS:
        return jsonify({'success': False, 'error': 'SMTP credentials not configured on server'}), 500
    try:
        msg = EmailMessage()
        msg['Subject'] = f'ShopHub — Your verification code'
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg.set_content(f'Your ShopHub verification code is: {otp}\nIt will expire in 10 minutes.')
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return jsonify({'success': True})
    except Exception as e:
        app.logger.exception('Failed to send email')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/request_sms', methods=['POST'])
def request_sms():
    data = request.get_json() or {}
    phone = data.get('phone')
    if not phone:
        return jsonify({'success': False, 'error': 'Missing phone'}), 400
    phone = phone.strip()
    code = str(100000 + (uuid.uuid4().int % 900000))
    expiry = (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    pending = read_json(PENDING_TOKENS_FILE) or {}
    pending_key = f'sms:{phone}'
    pending[pending_key] = {'phone': phone, 'code': code, 'expiry': expiry}
    write_json(PENDING_TOKENS_FILE, pending)
    body = f'Your ShopHub verification code is: {code}. It expires in 10 minutes.'
    last_exc = None
    try:
        via = data.get('via', 'sms') if isinstance(data, dict) else 'sms'
        if TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM:
            if via == 'whatsapp':
                send_whatsapp_via_twilio(phone, body)
            else:
                send_sms_via_twilio(phone, body)
            return jsonify({'success': True})
    except Exception as e:
        last_exc = str(e)
        app.logger.exception('Twilio send failed')
    if DEV_MODE:
        return jsonify({'success': True, 'dev_code': code})
    return jsonify({'success': False, 'error': 'SMS/WhatsApp provider error', 'details': last_exc}), 500


@app.route('/verify_sms', methods=['POST'])
def verify_sms():
    data = request.get_json() or {}
    phone = data.get('phone')
    code = data.get('code')
    if not phone or not code:
        return jsonify({'success': False, 'error': 'Missing phone or code'}), 400
    pending = read_json(PENDING_TOKENS_FILE) or {}
    pending_key = f'sms:{phone}'
    info = pending.get(pending_key)
    if not info:
        return jsonify({'success': False, 'error': 'No pending code for this phone'}), 400
    try:
        expiry = datetime.fromisoformat(info.get('expiry'))
    except Exception:
        expiry = datetime.utcnow() - timedelta(seconds=1)
    if datetime.utcnow() > expiry:
        pending.pop(pending_key, None)
        write_json(PENDING_TOKENS_FILE, pending)
        return jsonify({'success': False, 'error': 'Code expired'}), 400
    if str(info.get('code')) != str(code):
        return jsonify({'success': False, 'error': 'Invalid code'}), 400
    add_verified_phone(phone)
    pending.pop(pending_key, None)
    write_json(PENDING_TOKENS_FILE, pending)
    return jsonify({'success': True})


@app.route('/request_verify', methods=['POST'])
def request_verify():
    data = request.get_json() or {}
    to_email = data.get('email')
    if not to_email:
        return jsonify({'success': False, 'error': 'Missing email'}), 400
    if not SMTP_USER or not SMTP_PASS:
        return jsonify({'success': False, 'error': 'SMTP credentials not configured on server'}), 500
    token = str(uuid.uuid4())
    expiry = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    pending = read_json(PENDING_TOKENS_FILE) or {}
    pending[token] = {'email': to_email.lower(), 'expiry': expiry}
    write_json(PENDING_TOKENS_FILE, pending)
    host = request.host_url.rstrip('/')
    verify_link = f"{host}/verify?token={token}"
    try:
        msg = EmailMessage()
        msg['Subject'] = 'ShopHub — Verify your email'
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg.set_content(f"Click the link to verify your email for ShopHub:\n\n{verify_link}\n\nThis link expires in 24 hours.")
        if SMTP_USER and SMTP_PASS:
            context = ssl.create_default_context()
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.starttls(context=context)
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
            return jsonify({'success': True})
        if DEV_MODE:
            return jsonify({'success': True, 'dev_link': verify_link, 'token': token})
        return jsonify({'success': False, 'error': 'SMTP not configured on server'}), 500
    except Exception as e:
        app.logger.exception('Failed to send verification email')
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/verify')
def verify():
    token = request.args.get('token')
    if not token:
        return 'Invalid verification link', 400
    pending = read_json(PENDING_TOKENS_FILE) or {}
    info = pending.get(token)
    if not info:
        return '<h3>Invalid or expired verification link.</h3>', 400
    try:
        expiry = datetime.fromisoformat(info.get('expiry'))
    except Exception:
        expiry = datetime.utcnow() - timedelta(seconds=1)
    if datetime.utcnow() > expiry:
        pending.pop(token, None)
        write_json(PENDING_TOKENS_FILE, pending)
        return '<h3>Verification link expired.</h3>', 400
    email = info.get('email')
    add_verified_email(email)
    pending.pop(token, None)
    write_json(PENDING_TOKENS_FILE, pending)
    return f"<h3>Email {email} verified successfully.</h3><p><a href=\"/login.html\">Return to login</a></p>"


@app.route('/is_verified')
def is_verified():
    email = request.args.get('email')
    phone = request.args.get('phone')
    if phone:
        return jsonify({'verified': is_phone_verified(phone)})
    if email:
        return jsonify({'verified': is_email_verified(email)})
    return jsonify({'verified': False})


@app.route('/test_whatsapp', methods=['POST'])
def test_whatsapp():
    data = request.get_json() or {}
    phone = data.get('phone')
    body = data.get('body', 'ShopHub test WhatsApp message')
    if not phone:
        return jsonify({'success': False, 'error': 'Missing phone'}), 400
    if not (TWILIO_SID and TWILIO_TOKEN and TWILIO_FROM):
        return jsonify({'success': False, 'error': 'Twilio credentials not configured on server'}), 500
    try:
        resp = send_whatsapp_via_twilio(phone, body)
        return jsonify({'success': True, 'twilio': resp})
    except Exception as e:
        app.logger.exception('Test WhatsApp send failed')
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════
#  STATIC FILE SERVING
# ═══════════════════════════════════════════════════════════════════════

@app.route('/')
def index():
    # serve login.html by default but inject the chatbot script into the HTML
    path = 'login.html'
    full_path = os.path.join(app.root_path, path)
    if os.path.exists(full_path):
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        injection = '<!-- ShopKeeper AI Chatbot -->\n<script src="/shopkeeper.js"></script>'
        if '</body>' in content and injection not in content:
            content = content.replace('</body>', injection + '\n</body>')
        return content
    return send_from_directory('.', path)


@app.route('/<path:path>')
def static_proxy(path):
    # serve static files; inject chatbot script into HTML files on the fly
    full_path = os.path.join(app.root_path, path)
    if os.path.exists(full_path) and path.lower().endswith('.html'):
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            injection = '<!-- ShopKeeper AI Chatbot -->\n<script src="/shopkeeper.js"></script>'
            if '</body>' in content and injection not in content:
                content = content.replace('</body>', injection + '\n</body>')
            return content
        except Exception:
            # fallback to regular send if reading fails
            pass
    return send_from_directory('.', path)


# ═══════════════════════════════════════════════════════════════════════
#  START
# ═══════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    from db_init import init_db
    init_db(app)
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
