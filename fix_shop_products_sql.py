"""
fix_shop_products_sql.py  (v3)
- Uses shop.categories M2M where available
- Falls back to shop_type keyword matching for shops with no categories assigned
- Also cleans Inventory table
- Deactivates pet/cat food globally
No Django needed — pure sqlite3.

Run: python fix_shop_products_sql.py
"""

import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend', 'db.sqlite3')

# Fallback: categories allowed per shop_type (matched against category name/slug)
SHOP_TYPE_ALLOWED_KEYWORDS = {
    'kirana':    ['dairy', 'bakery', 'bread', 'egg', 'fresh', 'grocery', 'spice',
                  'dry fruit', 'beverage', 'drink', 'juice', 'snack', 'biscuit',
                  'sweet', 'chocolat', 'homegrown', 'instant', 'frozen', 'oil',
                  'ghee', 'tea', 'coffee', 'organic', 'rice', 'flour', 'grain',
                  'pulse', 'lentil', 'sugar', 'salt', 'fruit', 'vegetable',
                  'masala', 'pickle', 'sauce', 'noodle', 'pasta', 'atta',
                  'breakfast', 'cereal', 'health', 'baby'],
    'snacks':    ['snack', 'biscuit', 'namkeen', 'chips', 'crisps', 'sweet',
                  'chocolat', 'candy', 'beverage', 'drink', 'juice', 'tea',
                  'coffee', 'instant', 'munchies', 'homegrown', 'bakery',
                  'cookie', 'wafer'],
    'medical':   ['health', 'pharma', 'medicine', 'vitamin', 'supplement',
                  'baby', 'bath', 'body', 'groom', 'beauty', 'makeup',
                  'personal care', 'hygiene', 'sanitiz', 'first aid'],
    'clothing':  ['cloth', 'fashion', 'wear', 'apparel', 'accessor', 'garment',
                  'textile', 'kurti', 'saree', 'jeans', 'shirt', 'dress'],
    'household': ['home', 'living', 'clean', 'electronic', 'kitchen', 'bath',
                  'body', 'groom', 'utensil', 'decor', 'storage', 'organiz'],
    'pet':       ['pet', 'animal', 'dog', 'cat', 'kennel', 'vet'],
}

# Categories that should NEVER appear in non-specialist shops
BLOCKED_IN_GENERAL = ['clothing', 'fashion', 'pet care', 'pet food']


def shop_type_allows_category(shop_type, cat_name, cat_slug):
    keywords = SHOP_TYPE_ALLOWED_KEYWORDS.get(shop_type, [])
    name_l = (cat_name or '').lower()
    slug_l = (cat_slug or '').lower()
    for kw in keywords:
        if kw in name_l or kw in slug_l:
            return True
    return False


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: DB not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n=== Fixing Shop-Product Assignments (v3) ===\n")

    cur.execute("SELECT id, name, shop_type FROM core_shop")
    shops = cur.fetchall()

    total_removed = 0

    for shop in shops:
        shop_id   = shop['id']
        shop_name = shop['name']
        shop_type = shop['shop_type'] or 'kirana'

        # Get shop's assigned category IDs via M2M
        cur.execute("SELECT category_id FROM core_shop_categories WHERE shop_id=?", (shop_id,))
        assigned_cat_ids = set(row[0] for row in cur.fetchall())

        # Get ALL products linked to this shop with category info
        cur.execute("""
            SELECT sp.id as sp_id, sp.product_id, p.name as prod_name,
                   p.category_id, c.name as cat_name, c.slug as cat_slug
            FROM   core_shopproduct sp
            JOIN   core_product p ON p.id = sp.product_id
            LEFT JOIN core_category c ON c.id = p.category_id
            WHERE  sp.shop_id = ?
        """, (shop_id,))
        shop_prods = cur.fetchall()

        if not shop_prods:
            print(f"  [{shop_type}] {shop_name}: empty shop, skipping")
            continue

        to_remove_sp_ids = []
        to_remove_prod_ids = []

        for row in shop_prods:
            cat_id   = row['category_id']
            cat_name = row['cat_name'] or ''
            cat_slug = row['cat_slug'] or ''

            if assigned_cat_ids:
                # Use strict M2M check — product must belong to shop's category list
                allowed = cat_id in assigned_cat_ids
            else:
                # Fallback: keyword matching against shop_type
                allowed = shop_type_allows_category(shop_type, cat_name, cat_slug)

            if not allowed:
                to_remove_sp_ids.append(row['sp_id'])
                to_remove_prod_ids.append(row['product_id'])

        if to_remove_sp_ids:
            ph = ','.join('?' * len(to_remove_sp_ids))
            cur.execute(f"DELETE FROM core_shopproduct WHERE id IN ({ph})", to_remove_sp_ids)

            ph2 = ','.join('?' * len(to_remove_prod_ids))
            cur.execute(f"""
                DELETE FROM core_inventory
                WHERE shop_id=? AND product_id IN ({ph2})
            """, [shop_id] + to_remove_prod_ids)

            kept = len(shop_prods) - len(to_remove_sp_ids)
            total_removed += len(to_remove_sp_ids)
            print(f"  [{shop_type}] {shop_name}: REMOVED {len(to_remove_sp_ids)} wrong, kept {kept}")
        else:
            print(f"  [{shop_type}] {shop_name}: OK - all {len(shop_prods)} correct")

    # Globally deactivate pet/cat food from recommendations
    pet_q_list = ['%pet care%', '%pet food%', '%whiskas%', '%pedigree%',
                  '%drools%', '%cat food%', '%dog food%', '%me-o%']
    pet_deactivated = 0
    for kw in pet_q_list:
        cur.execute("UPDATE core_product SET visibility=0, status='inactive' WHERE LOWER(name) LIKE ?", (kw,))
        pet_deactivated += cur.rowcount

    cur.execute("""
        UPDATE core_product SET visibility=0, status='inactive'
        WHERE category_id IN (SELECT id FROM core_category WHERE LOWER(slug) LIKE '%pet%')
    """)
    pet_deactivated += cur.rowcount

    conn.commit()
    conn.close()

    print(f"\n[DONE]")
    print(f"  ShopProduct+Inventory entries removed: {total_removed}")
    print(f"  Pet/cat food deactivated globally    : {pet_deactivated}")


if __name__ == '__main__':
    main()
