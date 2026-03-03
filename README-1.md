# FastAPI Login System

A complete, secure authentication system built with FastAPI, SQLAlchemy, and JWT tokens.

## 🚀 Features

- ✅ User registration with validation
- ✅ Secure login with JWT tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based access control (Admin/User)
- ✅ Protected routes with authentication
- ✅ Rate limiting for login attempts
- ✅ SQLite database (easily scalable to PostgreSQL/MySQL)
- ✅ CORS enabled for frontend integration
- ✅ Interactive API documentation (Swagger UI & ReDoc)
- ✅ Python data structures for session management

## 📁 Project Structure

```
fastapi-login-system/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── database.py          # Database configuration
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas for validation
│   ├── crud.py              # Database operations
│   ├── auth.py              # Authentication & JWT utilities
│   └── routers/
│       └── login.py         # Authentication endpoints
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🛠️ Installation & Setup

### 1. Clone/Download the Project

```bash
cd fastapi-login-system
```

### 2. Create Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the Server

```bash
# Method 1: Using uvicorn directly
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Method 2: Using Python
python -m app.main
```

The server will start at: **http://127.0.0.1:8000**

## 📚 API Documentation

Once the server is running, access:

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## 🔌 API Endpoints

### 1. Register New User

**POST** `/register`

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "user"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2024-01-15T10:30:00"
}
```

**Password Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 digit

---

### 2. Login

**POST** `/login`

**Request Body:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Incorrect username or password"
}
```

---

### 3. Get Profile (Protected)

**GET** `/profile`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "role": "user",
  "created_at": "2024-01-15T10:30:00"
}
```

---

### 4. Get All Users (Admin Only)

**GET** `/users`

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "user",
    "created_at": "2024-01-15T10:30:00"
  },
  {
    "id": 2,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "created_at": "2024-01-15T09:00:00"
  }
]
```

## 🧪 Testing with cURL

### Register a User
```bash
curl -X POST "http://127.0.0.1:8000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123",
    "role": "user"
  }'
```

### Login
```bash
curl -X POST "http://127.0.0.1:8000/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123"
  }'
```

### Get Profile
```bash
curl -X GET "http://127.0.0.1:8000/profile" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🌐 Frontend Integration

### Simple HTML/JavaScript Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>Login</title>
</head>
<body>
    <h2>Login</h2>
    <form id="loginForm">
        <input type="text" id="username" placeholder="Username" required><br>
        <input type="password" id="password" placeholder="Password" required><br>
        <button type="submit">Login</button>
    </form>
    
    <div id="result"></div>

    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('http://127.0.0.1:8000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // Store token
                    localStorage.setItem('token', data.access_token);
                    document.getElementById('result').innerHTML = 
                        '<p style="color: green;">Login successful!</p>';
                    
                    // Fetch profile
                    const profileResponse = await fetch('http://127.0.0.1:8000/profile', {
                        headers: {
                            'Authorization': `Bearer ${data.access_token}`
                        }
                    });
                    
                    const profile = await profileResponse.json();
                    document.getElementById('result').innerHTML += 
                        `<p>Welcome, ${profile.username}!</p>`;
                } else {
                    document.getElementById('result').innerHTML = 
                        `<p style="color: red;">Error: ${data.detail}</p>`;
                }
            } catch (error) {
                document.getElementById('result').innerHTML = 
                    `<p style="color: red;">Error: ${error.message}</p>`;
            }
        });
    </script>
</body>
</html>
```

## 🔒 Security Features

1. **Password Hashing**: Uses bcrypt for secure password storage
2. **JWT Tokens**: Secure token-based authentication
3. **Role-Based Access**: Admin and User roles with different permissions
4. **Rate Limiting**: Prevents brute force attacks (5 attempts per 15 minutes)
5. **Input Validation**: Pydantic schemas validate all inputs
6. **CORS Protection**: Configurable cross-origin policies

## 🐍 Python Data Structures Used

- **Dictionary**: `login_attempts` tracks failed login attempts
- **Dictionary**: `ROLE_PERMISSIONS` maps roles to permissions
- **Lists**: Store timestamps for login attempt tracking
- **Classes**: SQLAlchemy models and Pydantic schemas

## 📊 Database Schema

### Users Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | Primary Key, Auto-increment |
| username | String(50) | Unique, Not Null, Indexed |
| email | String(100) | Unique, Not Null, Indexed |
| hashed_password | String(255) | Not Null |
| role | String(20) | Default: 'user', Not Null |
| created_at | DateTime | Auto-generated |

## 🚀 Deployment to Production

### For PostgreSQL

1. Update `database.py`:
```python
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
```

2. Install PostgreSQL driver:
```bash
pip install psycopg2-binary
```

### For MySQL

1. Update `database.py`:
```python
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@localhost/dbname"
```

2. Install MySQL driver:
```bash
pip install pymysql
```

### Environment Variables

For production, use environment variables for sensitive data:

```python
import os
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
```

### Run with Gunicorn (Production)

```bash
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 🐛 Troubleshooting

### Database Issues
- Delete `app.db` and restart the server to recreate the database

### CORS Errors
- Check that CORS middleware is properly configured in `main.py`
- For production, update `allow_origins` to specific domains

### Token Errors
- Ensure you're sending the token in the Authorization header
- Format: `Authorization: Bearer <token>`

## 📝 File Explanations

- **main.py**: FastAPI app initialization, CORS setup, router inclusion
- **database.py**: SQLAlchemy engine, session management, database connection
- **models.py**: User model definition with SQLAlchemy ORM
- **schemas.py**: Pydantic models for request/response validation
- **crud.py**: Database CRUD operations (Create, Read, Update, Delete)
- **auth.py**: Password hashing, JWT token creation/validation, user authentication
- **routers/login.py**: API endpoints for registration, login, and profile

## 📄 License

This project is open source and available for learning purposes.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!
