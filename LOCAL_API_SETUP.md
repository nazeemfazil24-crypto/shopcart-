# Local API Implementation Guide (Flask)

## 1. Install dependencies

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Initialize the database

```bash
python db_init.py
```

## 3. Run the Flask server

```bash
python app.py
```

- The API will be available at http://localhost:10000
- Frontend pages (signin.html, create_account.html) will interact with this API.

## 4. Test Endpoints
- Register: POST /api/register
- Login: POST /api/login
- Menu: GET/POST /api/menu
- Payments: GET/POST /api/payments

You now have a working local API for your project!
