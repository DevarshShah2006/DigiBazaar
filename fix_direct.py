"""
fix_direct.py - Brute force direct fix.
Deletes clothing/pet products from ALL non-clothing/non-pet shops directly.
No keywords, no M2M — just: if shop is medical and product is clothing, DELETE.
"""
import sqlite3, os

DB_PATH = '/home/DevarshShah/DigiBazaar/backend/db.sqlite3'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

print("=== Direct Fix: Removing wrong products from shops ===\n")

# Step 1: Find category IDs for clothing, fashion, pet care, accessories
cur.execute("""
    SELECT id, name, slug FROM core_category
    WHERE LOWER(name) LIKE '%cloth%'
       OR LOWER(name) LIKE '%fashion%'
       OR LOWER(name) LIKE '%apparel%'
       OR LOWER(name) LIKE '%pet%'
       OR LOWER(slug) LIKE '%cloth%'
       OR LOWER(slug) LIKE '%fashion%'
       OR LOWER(slug) LIKE '%pet%'
""")
banned_cats = cur.fetchall()
banned_cat_ids = [r[0] for r in banned_cats]
print("Banned categories (removing from all non-clothing/non-pet shops):")
for r in banned_cats:
    print(f"  id={r[0]} name={r[1]} slug={r[2]}")

if not banned_cat_ids:
    print("No banned categories found!")
else:
    ph = ','.join('?' * len(banned_cat_ids))

    # Step 2: Get shops that should NOT have these categories
    cur.execute(f"""
        SELECT id, name, shop_type FROM core_shop
        WHERE shop_type NOT IN ('clothing', 'pet', 'fashion')
    """)
    non_clothing_shops = cur.fetchall()
    print(f"\nShops to clean: {len(non_clothing_shops)}")

    total_removed = 0
    for shop in non_clothing_shops:
        shop_id, shop_name, shop_type = shop

        # Delete from core_shopproduct
        cur.execute(f"""
            DELETE FROM core_shopproduct
            WHERE shop_id = ?
              AND product_id IN (
                  SELECT id FROM core_product WHERE category_id IN ({ph})
              )
        """, [shop_id] + banned_cat_ids)
        sp_removed = cur.rowcount

        # Delete from core_inventory
        cur.execute(f"""
            DELETE FROM core_inventory
            WHERE shop_id = ?
              AND product_id IN (
                  SELECT id FROM core_product WHERE category_id IN ({ph})
              )
        """, [shop_id] + banned_cat_ids)
        inv_removed = cur.rowcount

        if sp_removed > 0 or inv_removed > 0:
            total_removed += sp_removed
            print(f"  [{shop_type}] {shop_name}: removed {sp_removed} ShopProduct + {inv_removed} Inventory")

    print(f"\n[DONE] Total ShopProduct rows removed: {total_removed}")

# Step 3: Also remove lifestyle/sports/accessories from medical shops
print("\n=== Extra: Removing sports/accessories from medical shops ===")
cur.execute("""
    SELECT id, name, slug FROM core_category
    WHERE LOWER(name) LIKE '%sport%'
       OR LOWER(name) LIKE '%footwear%'
       OR LOWER(name) LIKE '%shoe%'
       OR LOWER(name) LIKE '%accessori%'
       OR LOWER(name) LIKE '%bag%'
       OR LOWER(name) LIKE '%luggage%'
       OR LOWER(slug) LIKE '%sport%'
       OR LOWER(slug) LIKE '%footwear%'
       OR LOWER(slug) LIKE '%accessori%'
""")
extra_cats = cur.fetchall()
extra_cat_ids = [r[0] for r in extra_cats]
if extra_cat_ids:
    ph2 = ','.join('?' * len(extra_cat_ids))
    cur.execute(f"""
        DELETE FROM core_shopproduct
        WHERE shop_id IN (SELECT id FROM core_shop WHERE shop_type='medical')
          AND product_id IN (SELECT id FROM core_product WHERE category_id IN ({ph2}))
    """, extra_cat_ids)
    print(f"  Removed {cur.rowcount} sports/accessory items from medical shops")

    cur.execute(f"""
        DELETE FROM core_inventory
        WHERE shop_id IN (SELECT id FROM core_shop WHERE shop_type='medical')
          AND product_id IN (SELECT id FROM core_product WHERE category_id IN ({ph2}))
    """, extra_cat_ids)
    print(f"  Removed {cur.rowcount} sports/accessory inventory from medical shops")

conn.commit()
conn.close()
print("\nAll done! Refresh your browser with Ctrl+Shift+R")
