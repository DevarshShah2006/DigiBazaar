import os
import random
import numpy as np
import pandas as pd
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from django.db.models import Count, Q
from core.models import Shop, Product, ShopProduct, Inventory, Category, Subcategory

# Custom High-Quality Clothing Catalog
CUSTOM_CLOTHING_PRODUCTS = [
    {
        "name": "Men's Slim Fit Cotton T-Shirt",
        "brand": "Nike",
        "price": 599.00,
        "mrp": 899.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Men's Wear",
        "rating": 4.7,
        "review_count": 120
    },
    {
        "name": "Women's High Rise Denim Jeans",
        "brand": "Levi's",
        "price": 1899.00,
        "mrp": 2499.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Women's Wear",
        "rating": 4.6,
        "review_count": 210
    },
    {
        "name": "Unisex Fleece Pullover Hoodie",
        "brand": "H&M",
        "price": 1299.00,
        "mrp": 1799.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Unisex Wear",
        "rating": 4.8,
        "review_count": 95
    },
    {
        "name": "Ankle Length Cotton Socks (Pack of 3)",
        "brand": "Puma",
        "price": 349.00,
        "mrp": 499.00,
        "quantity_label": "3 Pairs",
        "image_url": "https://images.unsplash.com/photo-1582966772680-860e372bb558?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Accessories",
        "rating": 4.5,
        "review_count": 140
    },
    {
        "name": "Women's Floral Summer Dress",
        "brand": "Zara",
        "price": 1599.00,
        "mrp": 2199.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Women's Wear",
        "rating": 4.7,
        "review_count": 88
    },
    {
        "name": "Men's Casual Linen Shirt",
        "brand": "Tommy Hilfiger",
        "price": 1999.00,
        "mrp": 2799.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Men's Wear",
        "rating": 4.4,
        "review_count": 156
    },
    {
        "name": "Classic Leather Belt for Men",
        "brand": "Woodland",
        "price": 699.00,
        "mrp": 999.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1624222247344-550fb8ec8bd3?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Accessories",
        "rating": 4.5,
        "review_count": 65
    },
    {
        "name": "Sport Running Athletic Shorts",
        "brand": "Adidas",
        "price": 799.00,
        "mrp": 1099.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1539185441755-769473a23570?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Sportswear",
        "rating": 4.6,
        "review_count": 112
    },
    {
        "name": "Unisex Knit Beanie Cap",
        "brand": "H&M",
        "price": 399.00,
        "mrp": 599.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1576871337622-98d48d4353d0?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Accessories",
        "rating": 4.3,
        "review_count": 78
    },
    {
        "name": "High-Waist Athletic Gym Leggings",
        "brand": "Puma",
        "price": 1199.00,
        "mrp": 1499.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1506152983158-b4a74a01c721?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Sportswear",
        "rating": 4.7,
        "review_count": 134
    }
]

# Custom High-Quality Pet Care Catalog
CUSTOM_PET_PRODUCTS = [
    {
        "name": "Pedigree Adult Dry Dog Food (Chicken & Veg)",
        "brand": "Pedigree",
        "price": 429.00,
        "mrp": 520.00,
        "quantity_label": "1.2 kg",
        "image_url": "https://images.unsplash.com/photo-1589722244358-f0ec9f8c8540?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Dog Food",
        "rating": 4.8,
        "review_count": 310
    },
    {
        "name": "Whiskas Wet Cat Food (Salmon in Gravy)",
        "brand": "Whiskas",
        "price": 42.00,
        "mrp": 48.00,
        "quantity_label": "85 g",
        "image_url": "https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Cat Food",
        "rating": 4.7,
        "review_count": 480
    },
    {
        "name": "Orthopedic Memory Foam Pet Bed",
        "brand": "Chewers",
        "price": 2199.00,
        "mrp": 2799.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Bedding",
        "rating": 4.9,
        "review_count": 75
    },
    {
        "name": "Squeaky Rubber Ball Dog Toy",
        "brand": "Kong",
        "price": 249.00,
        "mrp": 299.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1581888227599-779811939961?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Dog Toys",
        "rating": 4.6,
        "review_count": 185
    },
    {
        "name": "Adjustable Reflective Collar & Leash Set",
        "brand": "Heads Up For Tails",
        "price": 499.00,
        "mrp": 599.00,
        "quantity_label": "1 set",
        "image_url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Pet Accessories",
        "rating": 4.5,
        "review_count": 92
    },
    {
        "name": "Royal Canin Kitten Dry Food",
        "brand": "Royal Canin",
        "price": 849.00,
        "mrp": 949.00,
        "quantity_label": "400 g",
        "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Cat Food",
        "rating": 4.8,
        "review_count": 150
    },
    {
        "name": "Tick & Flea Prevention Pet Shampoo",
        "brand": "Himalaya",
        "price": 220.00,
        "mrp": 250.00,
        "quantity_label": "200 ml",
        "image_url": "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Grooming",
        "rating": 4.4,
        "review_count": 68
    },
    {
        "name": "Interactive Feather Wand Cat Toy",
        "brand": "Chewers",
        "price": 149.00,
        "mrp": 199.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Cat Toys",
        "rating": 4.7,
        "review_count": 115
    },
    {
        "name": "Cat Scratching Post with Hanging Ball",
        "brand": "Pet Barn",
        "price": 1199.00,
        "mrp": 1499.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1545249390-6bdfa286032f?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Furniture",
        "rating": 4.6,
        "review_count": 89
    },
    {
        "name": "Double Stainless Steel Pet Feeding Bowls",
        "brand": "Pet Barn",
        "price": 449.00,
        "mrp": 549.00,
        "quantity_label": "1 pc",
        "image_url": "https://images.unsplash.com/photo-1535268647977-a403b69fc756?q=80&w=500&auto=format&fit=crop",
        "subcategory": "Pet Accessories",
        "rating": 4.5,
        "review_count": 74
    }
]


class Command(BaseCommand):
    help = "Imports curated products from Zepto dataset.xlsx, handles custom clothing & pet products, maps them uniquely to specialized shops, and clears old demo seeds."

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
        df['Original Price'] = df.apply(
            lambda r: r['Original Price'] if pd.notnull(r['Original Price']) and r['Original Price'] >= r['Price'] else r['Price'],
            axis=1
        )
        df['Ratings'] = pd.to_numeric(df['Ratings'], errors='coerce')
        df['Review'] = pd.to_numeric(df['Review'], errors='coerce').fillna(0.0)

        # Deduplicate master records by Name and Quantity
        df = df.sort_values(by=['Ratings', 'Review'], ascending=[False, False])
        df_unique = df.drop_duplicates(subset=['Name', 'Quantity'], keep='first').copy()

        # 2. Ranking and Sampling
        ranking_ratings = df_unique['Ratings'].fillna(4.2)
        reviews = df_unique['Review']
        max_reviews = reviews.max() if reviews.max() > 0 else 1.0
        normalized_reviews = reviews / max_reviews
        df_unique['Score'] = (ranking_ratings * 0.6) + (normalized_reviews * 0.4)

        # Proportional sampling
        total_unique = len(df_unique)
        if total_unique <= target_count:
            selected_df = df_unique
        else:
            category_counts = df_unique['Category'].value_counts()
            selected_rows = []
            for cat, count in category_counts.items():
                cat_df = df_unique[df_unique['Category'] == cat].sort_values(by='Score', ascending=False)
                cat_target = int(np.round((count / total_unique) * target_count))
                cat_target = max(min(cat_target, count), min(5, count))
                selected_rows.append(cat_df.head(cat_target))
            selected_df = pd.concat(selected_rows).drop_duplicates(subset=['Name', 'Quantity'])
            
            if len(selected_df) < target_count:
                remaining = df_unique[~df_unique.index.isin(selected_df.index)].sort_values(by='Score', ascending=False)
                needed = target_count - len(selected_df)
                selected_df = pd.concat([selected_df, remaining.head(needed)])
            elif len(selected_df) > target_count:
                selected_df = selected_df.head(target_count)

        if dry_run:
            self.stdout.write("Dry run complete. No database changes were made.")
            return

        # 3. Database operations
        with transaction.atomic():
            # CLEAR PREVIOUS SEEDS (Requirement: Remove bad image seeds and clear shop products completely)
            self.stdout.write(self.style.WARNING("Clearing previous inventory, shop products, and bad demo products..."))
            
            # Delete ALL shop products & inventories
            ShopProduct.objects.all().delete()
            Inventory.objects.all().delete()

            # Delete products that contain "example.com" or have empty/null quantity_label
            Product.objects.filter(
                Q(image_url__icontains="example.com") |
                Q(quantity_label="") |
                Q(quantity_label__isnull=True)
            ).delete()

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
                'Meats, Fish & Eggs': 'Dairy & Bakery',
                'Munchies': 'Snacks & Biscuits',
                'Sweet Cravings': 'Sweets & Chocolates',
                'Tea, Coffee & More': 'Tea & Coffee'
            }

            # Create Categories in DB if missing
            db_categories = {}
            for name in set(list(CATEGORY_MAPPING.values()) + ['Clothing', 'Pet Care']):
                slug = slugify(name)
                cat, _ = Category.objects.get_or_create(
                    slug=slug,
                    defaults={'name': name, 'description': f'{name} products', 'is_active': True}
                )
                db_categories[name] = cat

            # Brand Whitelist
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
                'Harpic', 'Comfort', 'Ariel', 'Tide', 'Rin', 'Pril', 'Exo', 'Hit', 'Goodknight', 'All Out'
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
                'Clothing':             (20, 60),
                'Pet Care':             (15, 50),
            }

            # Shop personalities for Kirana stores (13 stores total)
            KIRANA_SHOP_PROFILES = [
                {'profile': 'kirana_daily', 'focus': ['Dairy & Bakery', 'Fresh Produce', 'Grocery'], 'weight': 0.6, 'secondary': ['Snacks & Biscuits', 'Beverages', 'Cleaning'], 'product_count': (180, 250)},
                {'profile': 'kirana_snacks', 'focus': ['Snacks & Biscuits', 'Beverages', 'Sweets & Chocolates'], 'weight': 0.6, 'secondary': ['Grocery', 'Tea & Coffee', 'Breakfast & Pantry'], 'product_count': (150, 200)},
                {'profile': 'kirana_organic', 'focus': ['Homegrown', 'Fresh Produce', 'Spices & Dry Fruits'], 'weight': 0.6, 'secondary': ['Grocery', 'Tea & Coffee', 'Breakfast & Pantry'], 'product_count': (120, 180)},
                {'profile': 'kirana_general', 'focus': ['Grocery', 'Spices & Dry Fruits', 'Breakfast & Pantry'], 'weight': 0.4, 'secondary': ['Dairy & Bakery', 'Beverages', 'Snacks & Biscuits', 'Tea & Coffee', 'Frozen Foods', 'Baby & Kids'], 'product_count': (220, 300)}
            ]

            # Fetch existing shops
            shops = list(Shop.objects.all())
            self.stdout.write(f"Found {len(shops)} shops in the database.")

            kirana_shops = [s for s in shops if s.shop_type == 'kirana']
            kirana_shop_assignments = {}
            for idx, shop in enumerate(kirana_shops):
                profile_cfg = KIRANA_SHOP_PROFILES[idx % len(KIRANA_SHOP_PROFILES)]
                kirana_shop_assignments[shop.id] = profile_cfg

            # A. Create Custom Clothing Products
            self.stdout.write("Creating custom clothing catalog...")
            cat_clothing = db_categories['Clothing']
            clothing_db_products = []
            for item in CUSTOM_CLOTHING_PRODUCTS:
                subcat_name = item['subcategory']
                subcat_slug = slugify(subcat_name)
                subcat, _ = Subcategory.objects.get_or_create(
                    category=cat_clothing,
                    slug=subcat_slug,
                    defaults={'name': subcat_name, 'is_active': True}
                )
                prod, _ = Product.objects.get_or_create(
                    name=item['name'],
                    defaults={
                        'description': f"Premium quality {item['name']}.",
                        'brand': item['brand'],
                        'category': cat_clothing,
                        'subcategory': subcat,
                        'mrp': item['mrp'],
                        'selling_price': item['price'],
                        'price': item['price'],
                        'quantity_label': item['quantity_label'],
                        'rating': item['rating'],
                        'review_count': item['review_count'],
                        'image_url': item['image_url'],
                        'status': 'active',
                        'visibility': True,
                        'food_type': 'na'
                    }
                )
                clothing_db_products.append(prod)

            # B. Create Custom Pet Care Products
            self.stdout.write("Creating custom pet care catalog...")
            cat_pet = db_categories['Pet Care']
            pet_db_products = []
            for item in CUSTOM_PET_PRODUCTS:
                subcat_name = item['subcategory']
                subcat_slug = slugify(subcat_name)
                subcat, _ = Subcategory.objects.get_or_create(
                    category=cat_pet,
                    slug=subcat_slug,
                    defaults={'name': subcat_name, 'is_active': True}
                )
                prod, _ = Product.objects.get_or_create(
                    name=item['name'],
                    defaults={
                        'description': f"High quality {item['name']} for your pets.",
                        'brand': item['brand'],
                        'category': cat_pet,
                        'subcategory': subcat,
                        'mrp': item['mrp'],
                        'selling_price': item['price'],
                        'price': item['price'],
                        'quantity_label': item['quantity_label'],
                        'rating': item['rating'],
                        'review_count': item['review_count'],
                        'image_url': item['image_url'],
                        'status': 'active',
                        'visibility': True,
                        'food_type': 'na'
                    }
                )
                pet_db_products.append(prod)

            # C. Create Zepto Dataset Products
            self.stdout.write("Creating Zepto dataset products...")
            products_to_create = []
            created_zepto_products = []
            
            existing_products_map = {
                (p.name.lower().strip(), p.quantity_label.lower().strip()): p 
                for p in Product.objects.all()
            }

            for idx, row in selected_df.iterrows():
                name = str(row['Name']).strip()
                qty = str(row['Quantity']).strip()
                
                key = (name.lower(), qty.lower())
                if key in existing_products_map:
                    product = existing_products_map[key]
                else:
                    dataset_cat = row['Category']
                    db_cat_name = CATEGORY_MAPPING.get(dataset_cat, 'Grocery')
                    category_obj = db_categories[db_cat_name]

                    subcat_name = str(row['Sub-Category']).strip()
                    subcat_slug = slugify(subcat_name)
                    subcategory_obj, _ = Subcategory.objects.get_or_create(
                        category=category_obj,
                        slug=subcat_slug,
                        defaults={'name': subcat_name, 'is_active': True}
                    )

                    brand = extract_brand(name)
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
                
                created_zepto_products.append((product, row))

            if products_to_create:
                Product.objects.bulk_create(products_to_create)
                self.stdout.write(self.style.SUCCESS(f"Bulk created {len(products_to_create)} new master products from Zepto."))
                
                db_prods = {
                    (p.name.lower().strip(), p.quantity_label.lower().strip()): p 
                    for p in Product.objects.all()
                }
                updated_created = []
                for prod, row in created_zepto_products:
                    if prod.id is None:
                        key = (prod.name.lower().strip(), prod.quantity_label.lower().strip())
                        prod = db_prods.get(key, prod)
                    updated_created.append((prod, row))
                created_zepto_products = updated_created

            # Group Zepto products by Category
            category_products = {}
            for prod, row in created_zepto_products:
                cat_name = prod.category.name
                if cat_name not in category_products:
                    category_products[cat_name] = []
                category_products[cat_name].append((prod, row))

            # D. Link to Shops & Create Inventory
            self.stdout.write("Linking products to shops...")
            shop_products_to_create = []
            inventories_to_create = []

            for shop in shops:
                shop_type = shop.shop_type
                eligible_prods = []

                if shop_type == 'clothing':
                    # Clothing shops get ONLY custom clothing products. (NO Zepto products)
                    eligible_prods = [(p, None) for p in clothing_db_products]
                    self.stdout.write(f"Linking clothing shop '{shop.name}' ONLY with custom clothing catalog.")

                elif shop_type == 'pet':
                    # Pet shops get ONLY custom pet products. (NO Zepto products)
                    eligible_prods = [(p, None) for p in pet_db_products]
                    self.stdout.write(f"Linking pet shop '{shop.name}' ONLY with custom pet catalog.")

                elif shop_type == 'kirana':
                    # Kirana shops get Zepto products, NO clothing/pet
                    profile_cfg = kirana_shop_assignments.get(shop.id)
                    focus_cats = profile_cfg['focus']
                    secondary_cats = profile_cfg['secondary']
                    weight = profile_cfg['weight']
                    min_cnt, max_cnt = profile_cfg['product_count']
                    target_shop_cnt = random.randint(min_cnt, max_cnt)

                    focus_pool = []
                    for cat in focus_cats:
                        if cat not in ['Clothing', 'Pet Care']:
                            focus_pool.extend(category_products.get(cat, []))
                    
                    secondary_pool = []
                    for cat in secondary_cats:
                        if cat not in ['Clothing', 'Pet Care']:
                            secondary_pool.extend(category_products.get(cat, []))

                    focus_target = int(target_shop_cnt * weight)
                    focus_sampled = random.sample(focus_pool, min(focus_target, len(focus_pool))) if focus_pool else []
                    sec_target = target_shop_cnt - len(focus_sampled)
                    sec_sampled = random.sample(secondary_pool, min(sec_target, len(secondary_pool))) if secondary_pool else []

                    eligible_prods = focus_sampled + sec_sampled

                elif shop_type == 'medical':
                    # Health & Pharma only
                    pool = category_products.get('Health & Pharma', [])
                    target_shop_cnt = random.randint(80, 130)
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

                # Create linkages
                for prod, _ in eligible_prods:
                    price_var = random.uniform(-0.05, 0.05)
                    custom_price = round(float(prod.selling_price) * (1.0 + price_var), 2)
                    
                    mrp_float = float(prod.mrp)
                    if custom_price > mrp_float:
                        custom_price = mrp_float
                    if custom_price <= 0:
                        custom_price = float(prod.selling_price)

                    shop_products_to_create.append(ShopProduct(
                        shop=shop,
                        product=prod,
                        custom_price=custom_price,
                        is_available=True
                    ))

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
                        purchase_price=round(custom_price * 0.75, 2),
                        selling_price=custom_price,
                        expiry_date=None,
                    ))

            # Bulk write
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

        self.stdout.write(self.style.SUCCESS("Zepto & Custom Product Import finished successfully!"))
