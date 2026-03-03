# 🚀 FastAPI Login System - Deployment Strategies

## Table of Contents
1. [Local Development Deployment](#local-development-deployment)
2. [Production Deployment Options](#production-deployment-options)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Platform Deployments](#cloud-platform-deployments)
5. [Database Migration Strategy](#database-migration-strategy)
6. [Security Hardening for Production](#security-hardening-for-production)
7. [Monitoring & Logging](#monitoring--logging)
8. [CI/CD Pipeline](#cicd-pipeline)

---

## 1. Local Development Deployment

### Quick Start (Already Covered in README)
```bash
# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Development Best Practices
- Use SQLite for rapid development
- Enable auto-reload for code changes
- Use `.env` file for local configuration
- Test with Swagger UI at `/docs`

---

## 2. Production Deployment Options

### Strategy A: Traditional VPS/Server Deployment

**Use Case**: Full control, predictable costs, moderate traffic

**Steps:**

1. **Prepare Server** (Ubuntu 22.04 recommended)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.10+
sudo apt install python3.10 python3.10-venv python3-pip -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
```

2. **Setup Application**
```bash
# Create application user
sudo useradd -m -s /bin/bash fastapi
sudo su - fastapi

# Clone/upload your code
git clone <your-repo> /home/fastapi/app
cd /home/fastapi/app

# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn psycopg2-binary
```

3. **Configure Database**
```bash
# Create PostgreSQL database
sudo -u postgres psql
CREATE DATABASE login_system;
CREATE USER fastapi_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE login_system TO fastapi_user;
\q
```

4. **Update Configuration**

Create `.env` file:
```env
DATABASE_URL=postgresql://fastapi_user:secure_password@localhost/login_system
SECRET_KEY=generate-with-openssl-rand-hex-32
ENVIRONMENT=production
```

Update `database.py`:
```python
import os
from dotenv import load_dotenv

load_dotenv()
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
```

5. **Setup Systemd Service**

Create `/etc/systemd/system/fastapi.service`:
```ini
[Unit]
Description=FastAPI Login System
After=network.target

[Service]
User=fastapi
Group=fastapi
WorkingDirectory=/home/fastapi/app
Environment="PATH=/home/fastapi/app/venv/bin"
ExecStart=/home/fastapi/app/venv/bin/gunicorn app.main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/fastapi/access.log \
    --error-logfile /var/log/fastapi/error.log

Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable fastapi
sudo systemctl start fastapi
sudo systemctl status fastapi
```

6. **Setup Nginx Reverse Proxy**

Install Nginx:
```bash
sudo apt install nginx -y
```

Create `/etc/nginx/sites-available/fastapi`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/fastapi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

7. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Strategy B: Serverless Deployment (AWS Lambda)

**Use Case**: Variable traffic, pay-per-use, auto-scaling

**Requirements:**
- Mangum adapter for AWS Lambda
- AWS CLI configured
- Separate RDS database

**Setup:**

1. **Install Mangum**
```bash
pip install mangum
```

2. **Update `main.py`**
```python
from mangum import Mangum

# ... existing FastAPI code ...

# Add Lambda handler
handler = Mangum(app)
```

3. **Create Deployment Package**
```bash
pip install -r requirements.txt -t package/
cp -r app package/
cd package
zip -r ../deployment-package.zip .
```

4. **Deploy to AWS Lambda**
```bash
aws lambda create-function \
    --function-name fastapi-login \
    --runtime python3.10 \
    --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
    --handler app.main.handler \
    --zip-file fileb://deployment-package.zip
```

5. **Configure API Gateway**
- Create HTTP API in API Gateway
- Link to Lambda function
- Configure routes and CORS

---

## 3. Docker Deployment

### Dockerfile

Create `Dockerfile`:
```dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose (with PostgreSQL)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: login_system
      POSTGRES_USER: fastapi_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  web:
    build: .
    command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://fastapi_user:secure_password@db/login_system
      SECRET_KEY: your-secret-key-here
    depends_on:
      - db

volumes:
  postgres_data:
```

### Deploy with Docker
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 4. Cloud Platform Deployments

### A. Heroku

1. **Create `Procfile`**
```
web: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

2. **Add PostgreSQL addon**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

3. **Deploy**
```bash
git init
heroku create your-app-name
git add .
git commit -m "Initial commit"
git push heroku main
```

### B. Google Cloud Run

1. **Create Dockerfile** (same as above)

2. **Build and push**
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/fastapi-login
```

3. **Deploy**
```bash
gcloud run deploy fastapi-login \
    --image gcr.io/PROJECT-ID/fastapi-login \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated
```

### C. DigitalOcean App Platform

1. **Create `app.yaml`**
```yaml
name: fastapi-login
services:
  - name: web
    github:
      repo: your-username/your-repo
      branch: main
    build_command: pip install -r requirements.txt
    run_command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
    http_port: 8000
databases:
  - name: db
    engine: PG
    version: "15"
```

2. **Deploy via CLI or GUI**

### D. Railway

1. **Add `railway.json`**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Connect GitHub repo** and deploy

---

## 5. Database Migration Strategy

### Using Alembic

1. **Install Alembic**
```bash
pip install alembic
```

2. **Initialize**
```bash
alembic init alembic
```

3. **Configure `alembic.ini`**
```ini
sqlalchemy.url = postgresql://user:password@localhost/dbname
```

4. **Update `alembic/env.py`**
```python
from app.database import Base
from app.models import User

target_metadata = Base.metadata
```

5. **Create Migration**
```bash
alembic revision --autogenerate -m "Initial migration"
```

6. **Apply Migration**
```bash
alembic upgrade head
```

### Zero-Downtime Migration Strategy

1. **Blue-Green Deployment**
   - Deploy new version alongside old
   - Run migrations on new database
   - Switch traffic gradually
   - Rollback if issues

2. **Database Versioning**
   - Always make backward-compatible changes
   - Add new columns as nullable first
   - Deprecate old columns before removing

---

## 6. Security Hardening for Production

### Environment Variables

Create `.env.production`:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/dbname

# Security
SECRET_KEY=use-openssl-rand-hex-32-to-generate
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Environment
ENVIRONMENT=production
DEBUG=False
```

### Update `main.py` for Production

```python
import os
from dotenv import load_dotenv

load_dotenv()

# CORS with specific origins
origins = os.getenv("ALLOWED_ORIGINS", "").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### Security Checklist

- ✅ Use HTTPS only (enforce with HSTS headers)
- ✅ Strong SECRET_KEY (32+ random bytes)
- ✅ Rate limiting on all endpoints
- ✅ SQL injection prevention (using ORM)
- ✅ Input validation (Pydantic)
- ✅ CORS restricted to specific domains
- ✅ Environment variables for secrets
- ✅ Regular dependency updates
- ✅ Database connection encryption
- ✅ Logging without exposing sensitive data

---

## 7. Monitoring & Logging

### Application Logging

Update `main.py`:
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler('app.log', maxBytes=10485760, backupCount=10),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response
```

### Monitoring Tools

1. **Prometheus + Grafana**
```bash
pip install prometheus-fastapi-instrumentator
```

```python
from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)
```

2. **Sentry for Error Tracking**
```bash
pip install sentry-sdk
```

```python
import sentry_sdk

sentry_sdk.init(dsn="your-sentry-dsn")
```

3. **Health Checks**
```python
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connection
        db.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

---

## 8. CI/CD Pipeline

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest
      - name: Run tests
        run: pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/fastapi/app
            git pull origin main
            source venv/bin/activate
            pip install -r requirements.txt
            sudo systemctl restart fastapi
```

### GitLab CI/CD

Create `.gitlab-ci.yml`:
```yaml
stages:
  - test
  - deploy

test:
  stage: test
  image: python:3.10
  script:
    - pip install -r requirements.txt
    - pip install pytest
    - pytest

deploy:
  stage: deploy
  only:
    - main
  script:
    - ssh user@server 'cd /home/fastapi/app && git pull && systemctl restart fastapi'
```

---

## 9. Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] CORS configured for production domains
- [ ] SSL certificate obtained
- [ ] Secrets rotated (SECRET_KEY, database passwords)
- [ ] Dependencies updated and audited
- [ ] Backup strategy in place

### Deployment
- [ ] Database backed up
- [ ] Blue-green or canary deployment strategy
- [ ] Health checks configured
- [ ] Monitoring alerts set up
- [ ] Rate limiting enabled
- [ ] Logging configured

### Post-Deployment
- [ ] Smoke tests passed
- [ ] Monitoring dashboards checked
- [ ] Error rates normal
- [ ] Performance metrics acceptable
- [ ] Rollback plan ready

---

## 10. Recommended Deployment Path

### For Small Projects / Learning
→ **Docker + DigitalOcean Droplet**
- Easy to manage
- Predictable costs ($5-10/month)
- Full control

### For Growing Projects
→ **Docker + Cloud Run / Railway**
- Auto-scaling
- Pay-per-use
- Managed infrastructure

### For Enterprise
→ **Kubernetes + Cloud Provider**
- High availability
- Auto-scaling
- Multi-region deployment

---

## Conclusion

Choose your deployment strategy based on:
- **Traffic expectations**: Low → VPS, High → Serverless/K8s
- **Budget**: Limited → Heroku/Railway, Flexible → AWS/GCP
- **Technical expertise**: Beginner → Managed platforms, Expert → Self-hosted
- **Scaling needs**: Predictable → VPS, Variable → Serverless

Start simple, scale as needed. Always prioritize security and monitoring from day one.
