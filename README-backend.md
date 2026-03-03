# Backend setup (Flask + SQLite)

1. Create a virtualenv and install requirements:

```bash
python -m venv venv
venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

2. Initialize the database (creates `hotel.db` and seeds admin/user):

```bash
python db_init.py
```

3. Run the server:

```bash
python app.py
```

APIs created (examples):
- `POST /api/login`  {email, password}
- `POST /api/logout`
- `GET /api/menu`  list menu
- `POST /api/menu` create item
- `PUT /api/menu/<id>` update
- `DELETE /api/menu/<id>` delete
- `GET /api/payments` payment history
- `POST /api/payments` create payment
- `GET /api/stats/profit` returns revenue/cost/profit per day
- `POST /api/upload_image` multipart form with `image` file

Files added: `app.py`, `models.py`, `db_init.py`, `requirements.txt`.

If you want, I can wire the frontend (`index.html` / `admin.html`) to consume these APIs and render the profit graph using Chart.js.
