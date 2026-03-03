"""
Database initialization: create tables, seed admin account, migrate menu.json products.
Run this once, or it runs automatically when app.py starts.
"""

import json
import os
from flask_bcrypt import Bcrypt

from models import db, User, Product

bcrypt = Bcrypt()


def init_db(app):
    """Create all tables and seed initial data."""
    bcrypt.init_app(app)

    with app.app_context():
        db.create_all()

        # Seed admin account if not exists
        admin = User.query.filter_by(email='admin@shophub.com').first()
        if not admin:
            admin = User(
                email='admin@shophub.com',
                username='Admin',
                password_hash=bcrypt.generate_password_hash('admin123').decode('utf-8'),
                role='admin'
            )
            db.session.add(admin)
            db.session.commit()
            print('[db_init] Created default admin: admin@shophub.com / admin123')

        # Migrate products from menu.json if products table is empty
        if Product.query.count() == 0:
            menu_file = os.path.join(os.path.dirname(__file__), 'menu.json')
            if os.path.exists(menu_file):
                try:
                    with open(menu_file, 'r', encoding='utf-8') as f:
                        menu_data = json.load(f)
                    stores = menu_data.get('stores', [])
                    count = 0
                    for store in stores:
                        store_name = store.get('name', store.get('store', 'Store'))
                        category = store.get('category', '')
                        items = store.get('items', store.get('products', []))
                        for item in items:
                            product = Product(
                                name=item.get('name', ''),
                                price=item.get('price', 0),
                                description=item.get('description', ''),
                                category=category,
                                category_name=store_name,
                                image=item.get('image', ''),
                                rating=item.get('rating', 4.0),
                                reviews=item.get('reviews', 0),
                                seller_id=None  # system products
                            )
                            db.session.add(product)
                            count += 1
                    db.session.commit()
                    print(f'[db_init] Migrated {count} products from menu.json')
                except Exception as e:
                    print(f'[db_init] Error migrating menu.json: {e}')
                    db.session.rollback()
