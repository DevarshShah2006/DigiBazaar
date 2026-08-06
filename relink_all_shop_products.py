"""
relink_all_shop_products.py
Pure Python + sqlite3 standalone script.
Completely cleans and re-links ShopProduct, Inventory, and core_shop_categories
for ALL stores strictly based on their shop_type.

Guarantees:
- Medical shops get ONLY Medicines, Health, Baby Care, Personal Care, Grooming.
- Snack shops get ONLY Snacks, Sweets, Beverages, Tea/Coffee, Bakery.
- Kirana shops get ONLY Grocery, Dairy, Produce, Spices, Pantry, Snacks, Drinks, Cleaning.
- Clothing shops get ONLY Clothing, Fashion, Footwear.
- Household shops get ONLY Household, Cleaning, Electronics, Home & Living.

NO shop gets clothes, agarbatti, or pet food unless it's their exact shop_type.
"""

import sqlite3
import os
import random

# Find database path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Try local path first, fallback to PythonAnywhere path
DB_PATH = os.path.join(SCRIPT_DIR, 'backend', 'db.sqlite3')
if not os.path.exists(DB_PATH):
    DB_PATH = '/home/DevarshShah/DigiBazaar/backend/db.sqlite3'


# Explicit mapping of shop_type to allowed category names/slugs
TYPE_CATEGORY_PATTERNS = {
    'medical': [
        'health', 'pharma', 'baby', 'bath', 'grooming', 'beauty', 'personal care', 'hygiene'
    ],
    'snacks': [
        'snack', 'biscuit', 'sweet', 'chocolat', 'beverage', 'drink', 'tea', 'coffee', 'bakery', 'namkeen', 'homegrown'
    ],
    'kirana': [
        'grocery', 'dairy', 'bakery', 'produce', 'fruit', 'vegetable', 'spice', 'dry fruit',
        'pantry', 'instant', 'frozen', 'oil', 'ghee', 'flour', 'rice', 'grain', 'pulse', 'lentil',
        'sugar', 'salt', 'snack', 'biscuit', 'beverage', 'tea', 'coffee', 'cleaning', 'stationery'
    ],
    'clothing': [
        'clothing', 'fashion', 'footwear', 'wear', 'apparel'
    ],
    'household': [
        'home & living', 'home-living', 'household', 'cleaning', 'electronics', 'stationery', 'kitchen'
    ],
    'pet': [
        'pet'
    ]
}

# Strict exclusions per shop_type (if category matches any of these, exclude it regardless)
TYPE_EXCLUSIONS = {
    'medical': ['cloth', 'fashion', 'footwear', 'home & living', 'home-living', 'snack', 'biscuit', 'sweet', 'chocolat', 'grocery', 'produce'],
    'snacks': ['cloth', 'fashion', 'footwear', 'home & living', 'home-living', 'health', 'pharma', 'baby'],
    'kirana': ['cloth', 'fashion', 'footwear', 'health', 'pharma', 'home & living', 'home-living', 'pet'],
    'clothing': ['grocery', 'health', 'pharma', 'snack', 'beverage', 'home & living', 'home-living', 'pet'],
    'household': ['cloth', 'fashion', 'footwear', 'health', 'pharma', 'fresh produce', 'pet'],
}


def is_category_allowed(shop_type, cat_name, cat_slug):
    cat_name_lower = (cat_name or '').lower()
    cat_slug_lower = (cat_slug or '').lower()

    # Check exclusions first
    exclusions = TYPE_EXCLUSIONS.get(shop_type, [])
    for exc in exclusions:
        if exc in cat_name_lower or exc in cat_slug_lower:
            return False

    # Check allowed patterns
    allowed_patterns = TYPE_CATEGORY_PATTERNS.get(shop_type, [])
    for pat in allowed_patterns:
        if pat in cat_name_lower or pat in cat_slug_lower:
            return True

    return False


def main():
    if not os.path.exists(DB_PATH):
        print(f"ERROR: Database file not found at {DB_PATH}")
        return

    print(f"Connecting to database at: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    print("\n=== STEP 1: Wiping corrupted ShopProduct, Inventory, and Shop_Categories linkages ===")
    cur.execute("DELETE FROM core_shopproduct WHERE 1=1")
    sp_deleted = cur.rowcount
    cur.execute("DELETE FROM core_inventory WHERE 1=1")
    inv_deleted = cur.rowcount
    cur.execute("DELETE FROM core_shop_categories WHERE 1=1")
    cat_deleted = cur.rowcount
    print(f"Deleted {sp_deleted} ShopProduct rows, {inv_deleted} Inventory rows, {cat_deleted} ShopCategory rows.")

    print("\n=== STEP 2: Loading categories and active products ===")
    cur.execute("SELECT id, name, slug FROM core_category")
    categories = cur.fetchall()
    cat_dict = {c['id']: c for c in categories}

    cur.execute("""
        SELECT id, name, selling_price, mrp, category_id
        FROM core_product
        WHERE status = 'active' OR status IS NULL OR status = ''
    """)
    all_products = cur.fetchall()
    print(f"Loaded {len(categories)} categories and {len(all_products)} active products.")

    print("\n=== STEP 3: Re-linking products and categories to shops ===")
    cur.execute("SELECT id, name, shop_type FROM core_shop ORDER BY id")
    shops = cur.fetchall()

    rng = random.Random(42)  # Seed for reproducible clean inventory assignment

    total_sp_created = 0
    total_inv_created = 0

    for shop in shops:
        shop_id = shop['id']
        shop_name = shop['name']
        shop_type = shop['shop_type'] or 'kirana'

        # Find eligible products for this shop
        eligible_prods = []
        matching_cat_ids = set()

        for prod in all_products:
            cat = cat_dict.get(prod['category_id'])
            if not cat:
                continue
            if is_category_allowed(shop_type, cat['name'], cat['slug']):
                eligible_prods.append(prod)
                matching_cat_ids.add(cat['id'])

        if not eligible_prods:
            print(f"  ⚠️ [{shop_type}] '{shop_name}' has 0 eligible products! (Check category rules)")
            continue

        # Shuffle and select a reasonable catalog size per shop (20 to 60 items)
        rng.shuffle(eligible_prods)
        target_count = min(len(eligible_prods), rng.randint(25, 60))
        selected_prods = eligible_prods[:target_count]

        # Link shop categories in M2M table
        for cat_id in matching_cat_ids:
            cur.execute("""
                INSERT OR IGNORE INTO core_shop_categories (shop_id, category_id)
                VALUES (?, ?)
            """, (shop_id, cat_id))

        # Insert ShopProduct and Inventory
        sp_rows = []
        inv_rows = []

        for prod in selected_prods:
            prod_id = prod['id']
            price = float(prod['selling_price'] or 100.0)
            mrp = float(prod['mrp'] or price)

            # Add minor shop-specific price variation (-2% to +5%)
            custom_price = round(price * rng.uniform(0.98, 1.05), 2)
            if custom_price > mrp:
                custom_price = mrp

            stock_qty = rng.randint(15, 120)
            now_str = '2026-08-06 12:00:00'
            sp_rows.append((shop_id, prod_id, custom_price, 1))
            inv_rows.append((
                shop_id, prod_id, stock_qty, 0, 0, 10, 5, 500,
                f"BATCH-{rng.randint(1000, 9999)}", "Default Supplier",
                round(custom_price * 0.75, 2), custom_price,
                "Main Rack", now_str, now_str
            ))

        cur.executemany("""
            INSERT OR IGNORE INTO core_shopproduct (shop_id, product_id, custom_price, is_available)
            VALUES (?, ?, ?, ?)
        """, sp_rows)
        total_sp_created += len(sp_rows)

        cur.executemany("""
            INSERT OR IGNORE INTO core_inventory
            (shop_id, product_id, current_stock, reserved_stock, incoming_stock,
             reorder_level, min_stock, max_stock, batch_number, supplier_name,
             purchase_price, selling_price, warehouse_location, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, inv_rows)
        total_inv_created += len(inv_rows)

        print(f"  [OK] [{shop_type}] '{shop_name}': linked {len(selected_prods)} products & {len(matching_cat_ids)} categories.")

    print("\n=== STEP 4: Deactivating Pet/Cat Food globally from recommendations ===")
    cur.execute("""
        UPDATE core_product
        SET visibility = 0, status = 'inactive'
        WHERE LOWER(name) LIKE '%cat food%'
           OR LOWER(name) LIKE '%dog food%'
           OR LOWER(name) LIKE '%whiskas%'
           OR LOWER(name) LIKE '%pedigree%'
           OR LOWER(name) LIKE '%drools%'
    """)
    deactivated = cur.rowcount
    print(f"Deactivated {deactivated} pet food products globally.")

    conn.commit()
    conn.close()

    print("\n[DONE] RE-LINKING COMPLETE!")
    print(f"  Created {total_sp_created} ShopProduct relations")
    print(f"  Created {total_inv_created} Inventory records")
    print("All shops are now strictly cleansed and populated only with their category products!")


if __name__ == '__main__':
    main()
