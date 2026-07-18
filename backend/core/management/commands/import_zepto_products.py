import os
import random
import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from django.db.models import Count
from core.models import Shop, Product, ShopProduct, Inventory, Category, Subcategory

class Command(BaseCommand):
    help = "Imports curated products from Zepto dataset.xlsx, maps them to master records, and links them dynamically to shops with custom inventory and prices."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run the parser and print summary stats without modifying the database.'
        )
        parser.add_argument(
            '--target',
            type=int,
            default=4500,
            help='Target number of products to import.'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear previously imported products and relations before importing.'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        target_count = options['target']
        clear_db = options['clear']

        file_path = r"C:\Users\Devarsh\Desktop\Coding\DigiBazaar\zepto dataset.xlsx"
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"Dataset not found at: {file_path}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Reading dataset from {file_path}..."))
        df = pd.read_excel(file_path)
        self.stdout.write(self.style.SUCCESS(f"Loaded {len(df)} rows."))

        # 1. Apply Exclusions
        self.stdout.write("Applying exclusion rules...")
        
        # Exclude Paan Corner (adult products)
        df = df[df['Category'] != 'Paan Corner']
        
        # Exclude non-veg items from Meats, Fish & Eggs (keep Egg only)
        def keep_meat_eggs_row(row):
            if row['Category'] == 'Meats, Fish & Eggs':
                sub_cat = str(row['Sub-Category']).lower()
                return 'egg' in sub_cat
            return True
        df = df[df.apply(keep_meat_eggs_row, axis=1)]

        # Exclude non-veg sub-categories from Frozen Food & Ice Creams
        # (Exclude Non Veg Snacks, Raw Meats, Sausages, Salami & Ham)
        frozen_exclude_subs = ['Non Veg Snacks', 'Raw Meats', 'Sausages, Salami & Ham']
        df = df[~((df['Category'] == 'Frozen Food & Ice Creams') & (df['Sub-Category'].isin(frozen_exclude_subs)))]

        # Exclude Adult Nutrition from Tea, Coffee & More
        df = df[~((df['Category'] == 'Tea, Coffee & More') & (df['Sub-Category'] == 'Adult Nutrition'))]

        # Keep only available products
        df = df[df['Status'] == 'Available']

        self.stdout.write(f"Remaining available & eligible rows: {len(df)}")

        # Clean/Parse numeric columns
        df['Price'] = pd.to_numeric(df['Price'], errors='coerce').fillna(0.0)
        df['Original Price'] = pd.to_numeric(df['Original Price'], errors='coerce')
        # If original price is missing or lower than selling price, fallback to price
        df['Original Price'] = df.apply(
            lambda r: r['Original Price'] if pd.notnull(r['Original Price']) and r['Original Price'] >= r['Price'] else r['Price'],
            axis=1
        )
        df['Ratings'] = pd.to_numeric(df['Ratings'], errors='coerce')
        df['Review'] = pd.to_numeric(df['Review'], errors='coerce').fillna(0.0)

        # Deduplicate master records by Name and Quantity (to keep master records unique)
        # We'll keep the one with the highest Ratings / Reviews
        df = df.sort_values(by=['Ratings', 'Review'], ascending=[False, False])
        df_unique = df.drop_duplicates(subset=['Name', 'Quantity'], keep='first').copy()
        self.stdout.write(f"Unique master products: {len(df_unique)}")

        # 2. Ranking and Sampling
        # Score = Rating * 0.6 + normalized_Reviews * 0.4
        # Handle null ratings for ranking by filling with neutral 4.2
        ranking_ratings = df_unique['Ratings'].fillna(4.2)
        reviews = df_unique['Review']
        max_reviews = reviews.max() if reviews.max() > 0 else 1.0
        normalized_reviews = reviews / max_reviews
        df_unique['Score'] = (ranking_ratings * 0.6) + (normalized_reviews * 0.4)

        # Proportional sampling to get target_count (e.g. ~4500)
        # Select top products within each category based on score
        total_unique = len(df_unique)
        if total_unique <= target_count:
            selected_df = df_unique
        else:
            category_counts = df_unique['Category'].value_counts()
            selected_rows = []
            for cat, count in category_counts.items():
                cat_df = df_unique[df_unique['Category'] == cat].sort_values(by='Score', ascending=False)
                # Proportional target allocation
                cat_target = int(np.round((count / total_unique) * target_count))
                # Ensure at least 5 products per category if possible
                cat_target = max(min(cat_target, count), min(5, count))
                selected_rows.append(cat_df.head(cat_target))
            selected_df = pd.concat(selected_rows).drop_duplicates(subset=['Name', 'Quantity'])
            
            # If slightly short or over, adjust to target_count
            if len(selected_df) < target_count:
                remaining = df_unique[~df_unique.index.isin(selected_df.index)].sort_values(by='Score', ascending=False)
                needed = target_count - len(selected_df)
                selected_df = pd.concat([selected_df, remaining.head(needed)])
            elif len(selected_df) > target_count:
                selected_df = selected_df.head(target_count)

        self.stdout.write(self.style.SUCCESS(f"Selected {len(selected_df)} products for import."))

        if dry_run:
            self.stdout.write("Dry run complete. No database changes were made.")
            # Print sample counts by category
            print("\nSample Counts by Category:")
            print(selected_df['Category'].value_counts())
            return

        # 3. Database operations
        with transaction.atomic():
            if clear_db:
                self.stdout.write(self.style.WARNING("Clearing previously imported Zepto categories, subcategories, products and inventory..."))
                # Only delete products that have quantity_label set, to avoid deleting original 20 products
                Product.objects.exclude(quantity_label="").delete()
                # Remove categories created by import that are now empty
                Category.objects.annotate(prod_count=Count('products')).filter(prod_count=0).delete()
                Subcategory.objects.annotate(prod_count=Count('products')).filter(prod_count=0).delete()

            # Mapping categories from dataset to DB Categories
            CATEGORY_MAPPING = {
                'Atta, Rice, Oil & Dals': 'Grocery',
                'Baby Food': 'Baby & Kids',
                'Bath & Body': 'Bath & Body',
                'Biscuits': 'Snacks & Biscuits',
                'Breakfast & Sauces': 'Breakfast & Pantry',
                'Cleaning Essentials': 'Cleaning',
                'Cold Drinks & Juices': 'Beverages',
                'Dairy, Bread & Eggs': 'Dairy & Bakery',
                'Electricals & Accessories': 'Electronics',
                'Frozen Food & Ice Cream': 'Frozen Foods',
                'Frozen Food & Ice Creams': 'Frozen Foods',
                'Fruits & Vegetables': 'Fresh Produce',
                'Health & Baby Care': 'Health & Pharma',
                'Home Needs': 'Home & Living',
                'Homegrown Brands': 'Homegrown',
                'Hygiene & Grooming': 'Grooming',
                'Makeup & Beauty': 'Beauty & Makeup',
                'Masala & Dry Fruits': 'Spices & Dry Fruits',
                'Meats, Fish & Eggs': 'Dairy & Bakery',  # Only eggs will map here
                'Munchies': 'Snacks & Biscuits',
                'Sweet Cravings': 'Sweets & Chocolates',
                'Tea, Coffee & More': 'Tea & Coffee'
            }

            # Create Categories in DB if missing
            db_categories = {}
            for name in set(CATEGORY_MAPPING.values()):
                slug = slugify(name)
                cat, _ = Category.objects.get_or_create(
                    slug=slug,
                    defaults={'name': name, 'description': f'{name} products', 'is_active': True}
                )
                db_categories[name] = cat

            # Brand whitelist for brand extraction
            BRAND_WHITELIST = [
                'Amul', 'Tata', 'Parle', 'Britannia', 'Haldiram', 'MTR', 'Dabur', 'Patanjali', 'Nestle', 'Cadbury',
                'Maggi', 'Lays', 'Kurkure', 'Bisleri', 'Paper Boat', 'Raw Pressery', 'Epigamia', 'Mother Dairy',
                'Aashirvaad', 'Fortune', 'Saffola', 'Sundrop', 'Surf Excel', 'Vim', 'Dettol', 'Lifebuoy', 'Dove',
                'Nivea', 'Colgate', 'Oral-B', 'Gillette', 'Lakme', 'Maybelline', 'Himalaya', 'Mamaearth', 'Wow',
                'MCaffeine', 'Cetaphil', 'CeraVe', 'Neutrogena', 'Vaseline', 'Ponds', 'Fair & Lovely', 'Godrej',
                'Havells', 'Philips', 'boAt', 'Noise', 'Too Yumm', 'Bingo', 'Act II', 'Pepsi', 'Coca-Cola', 'Sprite',
                'Fanta', 'Thums Up', 'Limca', 'Frooti', 'Maaza', 'Appy Fizz', 'Red Bull', 'Monster', 'Sting',
                'Hersheys', 'Ferrero Rocher', 'KitKat', 'Snickers', '5 Star', 'Dairy Milk', 'Oreo', 'Hide & Seek',
                'Good Day', 'Jim Jam', 'Sunfeast', 'Two Brothers', '24 Mantra', 'Organic Tattva', 'True Elements',
                'Yoga Bar', 'Open Secret', 'The Whole Truth', 'Sleepy Owl', 'Rage Coffee', 'Country Delight',
                'Fresho', 'SafeHarvest', 'Garnier', 'Loreal', 'Pepsodent', 'Sensodyne', 'Close Up', 'Lizol',
                'Harpic', 'Comfort', 'Ariel', 'Tide', 'Rin', 'Pril', 'Exo', 'Hit', 'Goodknight', 'All Out',
                'Pedigree', 'Whiskas', 'Real', 'Tropicana', 'Bisk Farm', 'McVities', 'Unibic', 'Kwality Walls',
                'Amulya', 'Taaza', 'Gold', 'Cow Milk', 'Go Cheese', 'Britannia Cheese', 'Nutrella', 'Saffola Oats',
                'Kelloggs', 'Bagrrys', 'Quaker', 'Chocos', 'Honey', 'Lion Dates', 'Kissan', 'Hershey', 'Nutella',
                'Veeba', 'Funfoods', 'Del Monte', 'Nando', 'Samyang', 'Ching', 'Smith & Jones', 'Knorr', 'Yippee',
                'Top Ramen', 'Pillsbury', 'Suhana', 'Everest', 'Badshah', 'MDH', 'Catch', 'Keya', 'Urban Platter',
                'Happilo', 'Nutraj', 'Solimo', 'Vedaka', 'Borges', 'Figaro', 'Disano'
            ]

            def extract_brand(product_name):
                name_lower = product_name.lower()
                for brand in sorted(BRAND_WHITELIST, key=len, reverse=True):
                    if brand.lower() in name_lower:
                        return brand
                
                parts = product_name.split()
                if not parts:
                    return ""
                first_word = parts[0]
                if first_word.isdigit() and len(parts) > 1:
                    return f"{first_word} {parts[1]}"
                return first_word

            # Stock ranges per category
            STOCK_RANGES = {
                'Dairy & Bakery':       (20, 80),
                'Fresh Produce':        (30, 120),
                'Grocery':              (150, 300),
                'Snacks & Biscuits':    (40, 120),
                'Cleaning':             (20, 80),
                'Beverages':            (40, 150),
                'Spices & Dry Fruits':  (60, 200),
                'Health & Pharma':      (30, 100),
                'Beauty & Makeup':      (15, 60),
                'Electronics':          (5, 30),
                'Home & Living':        (10, 50),
                'Sweets & Chocolates':  (30, 100),
                'Tea & Coffee':         (40, 120),
                'Breakfast & Pantry':   (40, 120),
                'Frozen Foods':         (20, 60),
                'Baby & Kids':          (15, 50),
                'Bath & Body':          (20, 70),
                'Grooming':             (15, 60),
                'Homegrown':            (20, 80),
            }

            # Shop personalities for Kirana stores (13 stores total)
            KIRANA_SHOP_PROFILES = [
                # daily essentials focus
                {'profile': 'kirana_daily', 'focus': ['Dairy & Bakery', 'Fresh Produce', 'Grocery'], 'weight': 0.6, 'secondary': ['Snacks & Biscuits', 'Beverages', 'Cleaning'], 'product_count': (180, 250)},
                # snacks & drinks focus
                {'profile': 'kirana_snacks', 'focus': ['Snacks & Biscuits', 'Beverages', 'Sweets & Chocolates'], 'weight': 0.6, 'secondary': ['Grocery', 'Tea & Coffee', 'Breakfast & Pantry'], 'product_count': (150, 200)},
                # organic / premium focus
                {'profile': 'kirana_organic', 'focus': ['Homegrown', 'Fresh Produce', 'Spices & Dry Fruits'], 'weight': 0.6, 'secondary': ['Grocery', 'Tea & Coffee', 'Breakfast & Pantry'], 'product_count': (120, 180)},
                # general/widest range
                {'profile': 'kirana_general', 'focus': ['Grocery', 'Spices & Dry Fruits', 'Breakfast & Pantry'], 'weight': 0.4, 'secondary': ['Dairy & Bakery', 'Beverages', 'Snacks & Biscuits', 'Tea & Coffee', 'Frozen Foods', 'Baby & Kids'], 'product_count': (220, 300)}
            ]

            # Fetch existing shops
            shops = list(Shop.objects.all())
            self.stdout.write(f"Found {len(shops)} shops in the database.")

            # Assign profiles to Kirana shops
            kirana_shops = [s for s in shops if s.shop_type == 'kirana']
            kirana_shop_assignments = {}
            for idx, shop in enumerate(kirana_shops):
                # Cycle through the 4 profiles to distribute personality profiles evenly
                profile_cfg = KIRANA_SHOP_PROFILES[idx % len(KIRANA_SHOP_PROFILES)]
                kirana_shop_assignments[shop.id] = profile_cfg
                self.stdout.write(f"Shop '{shop.name}' assigned to profile '{profile_cfg['profile']}'")

            # Batch creation lists
            products_to_create = []
            shop_products_to_create = []
            inventories_to_create = []

            # 4. Create Master Products (in-memory first, then bulk create or get_or_create)
            created_products = []
            
            self.stdout.write("Creating master products...")
            
            # Pre-fetch existing products to prevent duplicates
            existing_products_map = {
                (p.name.lower().strip(), p.quantity_label.lower().strip()): p 
                for p in Product.objects.all()
            }

            for idx, row in selected_df.iterrows():
                name = str(row['Name']).strip()
                qty = str(row['Quantity']).strip()
                
                # Check for duplicate
                key = (name.lower(), qty.lower())
                if key in existing_products_map:
                    product = existing_products_map[key]
                else:
                    # Resolve category and subcategory
                    dataset_cat = row['Category']
                    db_cat_name = CATEGORY_MAPPING.get(dataset_cat, 'Grocery')
                    category_obj = db_categories[db_cat_name]

                    # Create subcategory (slugified)
                    subcat_name = str(row['Sub-Category']).strip()
                    subcat_slug = slugify(subcat_name)
                    subcategory_obj, _ = Subcategory.objects.get_or_create(
                        category=category_obj,
                        slug=subcat_slug,
                        defaults={'name': subcat_name, 'is_active': True}
                    )

                    # Extract Brand
                    brand = extract_brand(name)

                    # Rating (Store as None/NULL if NaN)
                    rating_val = row['Ratings']
                    if pd.isna(rating_val) or rating_val <= 0:
                        rating_val = None

                    product = Product(
                        name=name,
                        description=f"Fresh {name} delivered straight to your door.",
                        brand=brand,
                        category=category_obj,
                        subcategory=subcategory_obj,
                        mrp=row['Original Price'],
                        selling_price=row['Price'],
                        price=row['Price'],
                        quantity_label=qty,
                        rating=rating_val,
                        review_count=int(row['Review']),
                        image_url=row['Image'],
                        status='active',
                        visibility=True,
                        food_type='veg' if db_cat_name in ['Grocery', 'Dairy & Bakery', 'Snacks & Biscuits', 'Beverages', 'Fresh Produce', 'Frozen Foods', 'Spices & Dry Fruits', 'Sweets & Chocolates', 'Tea & Coffee'] else 'na'
                    )
                    products_to_create.append(product)
                
                created_products.append((product, row))

            if products_to_create:
                Product.objects.bulk_create(products_to_create)
                self.stdout.write(self.style.SUCCESS(f"Bulk created {len(products_to_create)} new master products."))
                
                # Refresh from DB to get IDs
                db_prods = {
                    (p.name.lower().strip(), p.quantity_label.lower().strip()): p 
                    for p in Product.objects.exclude(quantity_label="")
                }
                # Update created_products references
                updated_created = []
                for prod, row in created_products:
                    if prod.id is None:
                        key = (prod.name.lower().strip(), prod.quantity_label.lower().strip())
                        prod = db_prods.get(key, prod)
                    updated_created.append((prod, row))
                created_products = updated_created

            # Group products by Category to make shop assignment faster
            category_products = {}
            for prod, row in created_products:
                cat_name = prod.category.name
                if cat_name not in category_products:
                    category_products[cat_name] = []
                category_products[cat_name].append((prod, row))

            # 5. Link to Shops & Create Inventory
            self.stdout.write("Linking products to shops based on shop types and personalities...")

            for shop in shops:
                shop_type = shop.shop_type
                eligible_prods = []

                if shop_type == 'kirana':
                    # Determine personality
                    profile_cfg = kirana_shop_assignments.get(shop.id)
                    focus_cats = profile_cfg['focus']
                    secondary_cats = profile_cfg['secondary']
                    weight = profile_cfg['weight']
                    min_cnt, max_cnt = profile_cfg['product_count']
                    target_shop_cnt = random.randint(min_cnt, max_cnt)

                    # Gather products from focus and secondary categories
                    focus_pool = []
                    for cat in focus_cats:
                        focus_pool.extend(category_products.get(cat, []))
                    
                    secondary_pool = []
                    for cat in secondary_cats:
                        secondary_pool.extend(category_products.get(cat, []))

                    # Sample from focus pool
                    focus_target = int(target_shop_cnt * weight)
                    focus_sampled = random.sample(focus_pool, min(focus_target, len(focus_pool))) if focus_pool else []

                    # Sample from secondary pool
                    sec_target = target_shop_cnt - len(focus_sampled)
                    sec_sampled = random.sample(secondary_pool, min(sec_target, len(secondary_pool))) if secondary_pool else []

                    eligible_prods = focus_sampled + sec_sampled

                elif shop_type == 'medical':
                    # Health & Pharma only
                    pool = category_products.get('Health & Pharma', [])
                    target_shop_cnt = random.randint(80, 130)
                    eligible_prods = random.sample(pool, min(target_shop_cnt, len(pool))) if pool else []

                elif shop_type == 'clothing':
                    # Beauty & Makeup, Grooming
                    pool = category_products.get('Beauty & Makeup', []) + category_products.get('Grooming', [])
                    target_shop_cnt = random.randint(60, 100)
                    eligible_prods = random.sample(pool, min(target_shop_cnt, len(pool))) if pool else []

                elif shop_type == 'snacks':
                    # Snacks & Biscuits, Beverages, Sweets & Chocolates
                    pool = (category_products.get('Snacks & Biscuits', []) + 
                            category_products.get('Beverages', []) + 
                            category_products.get('Sweets & Chocolates', []))
                    target_shop_cnt = random.randint(80, 150)
                    eligible_prods = random.sample(pool, min(target_shop_cnt, len(pool))) if pool else []

                elif shop_type == 'household':
                    # Cleaning, Electronics, Home & Living, Bath & Body, Grooming
                    pool = (category_products.get('Cleaning', []) + 
                            category_products.get('Electronics', []) + 
                            category_products.get('Home & Living', []) + 
                            category_products.get('Bath & Body', []) + 
                            category_products.get('Grooming', []))
                    target_shop_cnt = random.randint(80, 120)
                    eligible_prods = random.sample(pool, min(target_shop_cnt, len(pool))) if pool else []

                elif shop_type == 'pet':
                    # Zepto has no pet products, keep empty
                    eligible_prods = []

                # Create ShopProduct & Inventory entries
                for prod, row in eligible_prods:
                    # Shop-specific price variation (±5%)
                    price_var = random.uniform(-0.05, 0.05)
                    custom_price = round(float(prod.selling_price) * (1.0 + price_var), 2)
                    
                    # Ensure price doesn't exceed MRP
                    mrp_float = float(prod.mrp)
                    if custom_price > mrp_float:
                        custom_price = mrp_float
                    if custom_price <= 0:
                        custom_price = float(prod.selling_price)

                    # Create M2M ShopProduct link
                    shop_products_to_create.append(ShopProduct(
                        shop=shop,
                        product=prod,
                        custom_price=custom_price,
                        is_available=True
                    ))

                    # Determine stock level range by Category (Req #3)
                    cat_name = prod.category.name
                    stock_min, stock_max = STOCK_RANGES.get(cat_name, (10, 50))
                    stock_qty = random.randint(stock_min, stock_max)

                    inventories_to_create.append(Inventory(
                        shop=shop,
                        product=prod,
                        current_stock=stock_qty,
                        reserved_stock=0,
                        incoming_stock=0,
                        reorder_level=10,
                        min_stock=5,
                        max_stock=500,
                        purchase_price=round(custom_price * 0.75, 2), # 25% profit margin simulation
                        selling_price=custom_price,
                        expiry_date=None,
                    ))

            # Bulk create relationships
            if shop_products_to_create:
                seen_relations = set()
                unique_shop_products = []
                unique_inventories = []
                
                for idx, sp in enumerate(shop_products_to_create):
                    key = (sp.shop_id, sp.product_id)
                    if key not in seen_relations:
                        seen_relations.add(key)
                        unique_shop_products.append(sp)
                        unique_inventories.append(inventories_to_create[idx])

                ShopProduct.objects.bulk_create(unique_shop_products, ignore_conflicts=True)
                Inventory.objects.bulk_create(unique_inventories, ignore_conflicts=True)
                
                self.stdout.write(self.style.SUCCESS(
                    f"Successfully created {len(unique_shop_products)} ShopProduct relationships and Inventory records."
                ))

        self.stdout.write(self.style.SUCCESS("Zepto Product Import command finished successfully!"))
