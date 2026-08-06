"""
fix_shop_products_sql.py
Standalone script - no Django needed. Works directly with SQLite.
Removes products from shops where the category doesn't match the shop type.
Also deactivates pet/cat food products globally.

Run from the DigiBazaar root:
    python fix_shop_products_sql.py
"""

import sqlite3
import os

# Path to your SQLite DB (relative to this script location)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'db.sqlite3')

# Keywords allowed per shop type (matched against category name/slug)
SHOP_TYPE_ALLOWED_KEYWORDS = {
    'kirana':    ['dairy', 'bakery', 'fresh', 'grocery', 'spice', 'dry fruit',
                  'beverage', 'snack', 'biscuit', 'sweet', 'chocolat', 'homegrown',
                  'instant', 'frozen', 'oil', 'ghee', 'tea', 'coffee', 'organic',
                  'rice', 'flour', 'grain', 'pulse', 'lentil', 'sugar', 'salt'],
    'snacks':    ['snack', 'biscuit', 'sweet', 'chocolat', 'beverage', 'tea',
                  'coffee', 'instant', 'namkeen', 'homegrown', 'chips', 'munchies'],
    'medical':   ['health', 'pharma', 'baby', 'bath', 'body', 'groom',
                  'beauty', 'makeup', 'personal care', 'medicine', 'vitamin'],
    'clothing':  ['cloth', 'fashion', 'wear', 'apparel', 'accessor', 'garment'],
    'household': ['home', 'living', 'clean', 'electronic', 'kitchen', 'bath',
                  'body', 'groom', 'utensil', 'decor'],
    'pet':       ['pet', 'animal', 'dog', 'cat', 'kennel'],
}

# Keywords for products/categories that should be EXCLUDED globally from recommendations
PET_KEYWORDS = ['pet', 'cat food', 'dog food', 'whiskas', 'pedigree', 'drools', 'me-o', 'kitten', 'puppy']


def category_allowed(cat_name, cat_slug, shop_type):
    keywords = SHOP_TYPE_ALLOWED_KEYWORDS.get(shop_type, [])
    cat_name = (cat_name or '').lower()
    cat_slug = (cat_slug or '').lower()
    for kw in keywords:
        if kw in cat_name or kw in cat_slug:
            return True
    return False


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n=== Fixing Shop-Product Assignments (Direct SQL) ===\n")

    # Get all shops
    cur.execute("SELECT id, name, shop_type FROM core_shop")
    shops = cur.fetchall()

    total_removed = 0

    for shop in shops:
        shop_id   = shop['id']
        shop_name = shop['name']
        shop_type = shop['shop_type'] or 'kirana'

        # Get all products linked to this shop with their category info
        cur.execute("""
            SELECT sp.id as sp_id, sp.product_id, p.name as prod_name,
                   c.name as cat_name, c.slug as cat_slug
            FROM   core_shopproduct sp
            JOIN   core_product p  ON p.id = sp.product_id
            LEFT JOIN core_category c ON c.id = p.category_id
            WHERE  sp.shop_id = ?
        """, (shop_id,))
        shop_prods = cur.fetchall()

        to_remove = []
        for row in shop_prods:
            allowed = category_allowed(row['cat_name'], row['cat_slug'], shop_type)
            if not allowed:
                to_remove.append(row['sp_id'])

        if to_remove:
            placeholders = ','.join('?' * len(to_remove))
            cur.execute(f"DELETE FROM core_shopproduct WHERE id IN ({placeholders})", to_remove)
            total_removed += len(to_remove)
            print(f"  [{shop_type}] {shop_name}: removed {len(to_remove)} wrong products")
        else:
            print(f"  [{shop_type}] {shop_name}: OK - {len(shop_prods)} products all valid")

    # Deactivate pet/cat food products globally
    pet_removed = 0
    cur.execute("""
        SELECT id FROM core_category
        WHERE LOWER(name) LIKE '%pet%' OR LOWER(slug) LIKE '%pet%'
    """)
    pet_cat_ids = [row[0] for row in cur.fetchall()]

    if pet_cat_ids:
        placeholders = ','.join('?' * len(pet_cat_ids))
        cur.execute(f"""
            UPDATE core_product
            SET visibility = 0, status = 'inactive'
            WHERE category_id IN ({placeholders})
        """, pet_cat_ids)
        pet_removed += cur.rowcount

    # Also deactivate by name keywords
    for kw in PET_KEYWORDS:
        cur.execute("""
            UPDATE core_product
            SET visibility = 0, status = 'inactive'
            WHERE LOWER(name) LIKE ?
        """, (f'%{kw}%',))
        pet_removed += cur.rowcount

    conn.commit()
    conn.close()

    print(f"\n[DONE]")
    print(f"  ShopProduct entries removed (wrong category): {total_removed}")
    print(f"  Pet/cat food products deactivated globally:   {pet_removed}")


if __name__ == '__main__':
    main()
