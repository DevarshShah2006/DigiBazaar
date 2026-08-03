"""
seed_master_data -- Comprehensive DigiBazaar data seeder.

Generates:
  - 150 customers with realistic Ahmedabad addresses & RFM segments
  - 20 riders with zones, ratings, earnings, and delivery history
  - 7000-9000 realistic Indian-market orders (365-day history)
  - OrderItems drawn from real shop products with Indian price ranges
  - OrderTimeline events for every completed / in-flight order
  - DeliveryAssignment records tied to riders
  - SearchHistory per customer (keyword frequency for ML)
  - Review records (verified purchase, shop + product)
  - Coupon codes per shop (active & expired)
  - DemandForecast records for ML stockout predictions
  - Notification records per user / shop_owner / rider
  - Updates Shop.total_orders_served & Customer stats

Usage:
    python manage.py seed_master_data
    python manage.py seed_master_data --orders 8000 --seed 2025
"""

import random
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.models import (
    Category,
    Customer, CustomerAddress,
    Coupon,
    DeliveryAssignment,
    DemandForecast,
    Inventory, InventoryLog,
    Notification,
    Order, OrderItem, OrderTimeline,
    Product,
    Review,
    Rider,
    Shop, ShopOwner, ShopProduct,
    UserProfile,
    Wishlist,
    MarketSearchTrend,
)

User = get_user_model()

# -- Indian Name Pools -------------------------------------------
FIRST_NAMES_MALE = [
    "Aarav", "Rohan", "Vivek", "Karan", "Arjun", "Harsh", "Raj", "Dev",
    "Amit", "Nikhil", "Sahil", "Yash", "Dhruv", "Mihir", "Varun", "Kunal",
    "Parth", "Jay", "Manav", "Gaurav", "Chirag", "Pranav", "Vikram", "Aditya",
    "Siddharth", "Rahul", "Suresh", "Manoj", "Ravi", "Deepak", "Rajesh",
    "Pradeep", "Sandeep", "Vijay", "Ajay", "Ramesh", "Sunil", "Dinesh",
    "Mahesh", "Naresh", "Girish", "Hitesh", "Jignesh", "Kamlesh", "Bhavesh",
    "Dipesh", "Rakesh", "Umesh", "Yogesh", "Haresh", "Pratik", "Darshan",
    "Nilesh", "Mukesh", "Alpesh", "Chirag", "Tushar", "Rushabh", "Manan",
    "Jayesh", "Keval", "Hiren", "Viral", "Vishal", "Neel", "Smit", "Dhrumil",
]
FIRST_NAMES_FEMALE = [
    "Priya", "Ananya", "Neha", "Meera", "Divya", "Pooja", "Shreya", "Riya",
    "Kavya", "Tanvi", "Ishita", "Nisha", "Aisha", "Jhanvi", "Tanya", "Swati",
    "Kriti", "Diya", "Bhavna", "Aditi", "Sneha", "Megha", "Sonam", "Pallavi",
    "Mira", "Kavita", "Rekha", "Sunita", "Anita", "Geeta", "Sita", "Rita",
    "Usha", "Asha", "Nidhi", "Ridhi", "Khyati", "Foram", "Hetal", "Komal",
    "Monal", "Payal", "Riddhi", "Siddhi", "Vaishnavi", "Drashti", "Foram",
    "Janki", "Kinjal", "Latika", "Mansi", "Niyati", "Pinky", "Roshni",
]
LAST_NAMES = [
    "Patel", "Shah", "Modi", "Mehta", "Joshi", "Desai", "Trivedi", "Pandya",
    "Gandhi", "Parikh", "Bhatt", "Suthar", "Solanki", "Chauhan", "Rana",
    "Chaudhary", "Sharma", "Gupta", "Agarwal", "Jain", "Kumar", "Singh",
    "Thakur", "Patil", "Reddy", "Nair", "Menon", "Iyer", "Kapoor", "Malhotra",
]

# -- Ahmedabad Areas + Coords ------------------------------------
AREAS = [
    # (area_name, pincode, lat_base, lon_base, lat_spread, lon_spread)
    ("Paldi",         "380007", 23.0105, 72.5612, 0.005, 0.005),
    ("Vasna",         "380007", 23.0039, 72.5460, 0.006, 0.006),
    ("Satellite",     "380015", 23.0270, 72.5180, 0.008, 0.008),
    ("Shyamal",       "380015", 23.0150, 72.5345, 0.004, 0.004),
    ("Ellisbridge",   "380006", 23.0263, 72.5568, 0.005, 0.005),
    ("Ambawadi",      "380006", 23.0210, 72.5510, 0.006, 0.006),
    ("Gulbai Tekra",  "380006", 23.0240, 72.5550, 0.004, 0.004),
    ("Shivranjani",   "380015", 23.0245, 72.5290, 0.005, 0.005),
    ("Prahlad Nagar", "380015", 23.0120, 72.5100, 0.007, 0.007),
    ("Vastrapur",     "380054", 23.0380, 72.5250, 0.007, 0.007),
    ("Bodakdev",      "380054", 23.0520, 72.5130, 0.008, 0.008),
    ("Navrangpura",   "380009", 23.0355, 72.5580, 0.005, 0.005),
    ("Maninagar",     "380008", 22.9982, 72.5979, 0.007, 0.007),
    ("Gota",          "382481", 23.1005, 72.5090, 0.008, 0.008),
    ("Chandkheda",    "382424", 23.1098, 72.5763, 0.008, 0.008),
]

# -- Rider Data --------------------------------------------------
RIDER_DATA = [
    {"name": "Ramesh Bhai",    "phone": "9876500001", "vehicle": "Motorcycle",  "plate": "GJ-01-HA-1001"},
    {"name": "Suresh Patel",   "phone": "9876500002", "vehicle": "Motorcycle",  "plate": "GJ-01-HA-1002"},
    {"name": "Dinesh Shah",    "phone": "9876500003", "vehicle": "Bicycle",     "plate": "GJ-01-HB-2003"},
    {"name": "Mahesh Kumar",   "phone": "9876500004", "vehicle": "Scooter",     "plate": "GJ-01-HC-3004"},
    {"name": "Vijay Solanki",  "phone": "9876500005", "vehicle": "Motorcycle",  "plate": "GJ-05-AA-4005"},
    {"name": "Ajay Singh",     "phone": "9876500006", "vehicle": "Motorcycle",  "plate": "GJ-05-AB-5006"},
    {"name": "Kiran Rathod",   "phone": "9876500007", "vehicle": "Scooter",     "plate": "GJ-01-CD-6007"},
    {"name": "Pratik Bhatt",   "phone": "9876500008", "vehicle": "Motorcycle",  "plate": "GJ-01-CE-7008"},
    {"name": "Nitin Joshi",    "phone": "9876500009", "vehicle": "Bicycle",     "plate": "GJ-18-AA-8009"},
    {"name": "Rakesh Yadav",   "phone": "9876500010", "vehicle": "Motorcycle",  "plate": "GJ-01-DE-9010"},
    {"name": "Deepak Thakur",  "phone": "9876500011", "vehicle": "Scooter",     "plate": "GJ-01-CF-0011"},
    {"name": "Ganesh Iyer",    "phone": "9876500012", "vehicle": "Motorcycle",  "plate": "GJ-05-AC-1012"},
    {"name": "Harish Nair",    "phone": "9876500013", "vehicle": "Motorcycle",  "plate": "GJ-01-DF-2013"},
    {"name": "Jatin Pandya",   "phone": "9876500014", "vehicle": "Bicycle",     "plate": "GJ-01-EG-3014"},
    {"name": "Kapil Trivedi",  "phone": "9876500015", "vehicle": "Scooter",     "plate": "GJ-01-EH-4015"},
    {"name": "Lalit Mehta",    "phone": "9876500016", "vehicle": "Motorcycle",  "plate": "GJ-01-FI-5016"},
    {"name": "Mohan Desai",    "phone": "9876500017", "vehicle": "Motorcycle",  "plate": "GJ-01-FJ-6017"},
    {"name": "Nilesh Parikh",  "phone": "9876500018", "vehicle": "Scooter",     "plate": "GJ-01-GK-7018"},
    {"name": "Om Chaudhary",   "phone": "9876500019", "vehicle": "Motorcycle",  "plate": "GJ-05-AD-8019"},
    {"name": "Paresh Modi",    "phone": "9876500020", "vehicle": "Motorcycle",  "plate": "GJ-01-GL-9020"},
]

# -- Indian Market Search Keywords -------------------------------
SEARCH_KEYWORDS = [
    # Grocery
    "atta", "basmati rice", "toor dal", "chana dal", "moong dal", "urad dal",
    "mustard oil", "sunflower oil", "groundnut oil", "ghee", "butter", "paneer",
    "milk", "curd", "chaas", "amul milk", "mother dairy", "amul butter",
    "sugar", "jaggery", "salt", "turmeric", "red chilli powder", "coriander powder",
    "garam masala", "cumin seeds", "mustard seeds", "hing",
    # Snacks
    "chips", "biscuits", "namkeen", "khakhra", "thepla", "chakli", "sev",
    "parle g", "britannia", "haldirams", "lay's", "kurkure",
    # Beverages
    "cold drink", "pepsi", "coke", "sprite", "limca", "frooti", "maaza",
    "mineral water", "bisleri", "kinley", "aquafina", "chaas",
    "coffee", "tea", "green tea", "doodh patti chai",
    # Health/Medical
    "dettol", "savlon", "disprin", "crocin", "vicks", "burnol",
    "band aid", "vitamin c", "calcium tablets", "protein powder",
    # Personal Care
    "shampoo", "conditioner", "soap", "face wash", "moisturizer",
    "sunscreen", "body lotion", "deodorant", "toothpaste", "toothbrush",
    # Household
    "detergent", "washing powder", "dishwash", "floor cleaner", "toilet cleaner",
    "phenyl", "room freshener", "insect repellent",
    # Baby
    "pampers", "johnsons baby", "baby powder", "baby oil", "diaper",
    # Fashion
    "kurta", "saree", "dupatta", "chaniya choli", "lehenga",
    "t-shirt", "jeans", "salwar",
    # Pet
    "pedigree", "royal canin", "whiskas", "dog food", "cat food",
]

# -- Review Texts (Indian context) -------------------------------
POSITIVE_REVIEWS = [
    "Bahut acha product hai! Bilkul fresh mila.", "Excellent quality, highly recommended.",
    "Delivery bahut fast thi, 20 minute mein aa gaya!", "Sab kuch ekdum sahi tha.",
    "Prices are very reasonable compared to market.", "Acha packaging tha, nothing was broken.",
    "Will order again! Very satisfied.", "Quality is exactly as shown in images.",
    "Super fast delivery! Paldi mein 15 min mein pahunch gaya.", "5 stars for freshness.",
    "Ghee ki quality bahut aachi thi, ekdum desi.", "Best kirana shop in the area!",
    "Rice grains were intact, no broken pieces. Good quality.", "Thepla was very soft and fresh.",
    "Medicines were genuine, packed properly.", "Great service, will recommend to friends.",
    "Price kam hai aur quality zyada. Perfect!", "Order was accurate, nothing missing.",
    "Atta was fresh, chapati bani perfectly.", "Paneer was very soft and fresh!",
]
NEUTRAL_REVIEWS = [
    "Theek hai, average product.", "Delivery time could be better.",
    "Product is okay but packaging could improve.", "Average experience.",
    "Kuch items missing the, baaki sahi tha.", "Price thoda zyada lagaa.",
    "Delivery on time but product quality so-so.", "Expected better quality.",
    "Nothing special but nothing bad either.", "Decent, would order if nothing else available.",
]
NEGATIVE_REVIEWS = [
    "Dal mein kankad tha, disappointing!", "Product expired tha, please check before sending.",
    "Very late delivery, almost 2 hours!", "Wrong item was delivered.",
    "Packet tha lekin kuch cheez missing thi.", "Quality bhi kuch khaas nahi.",
    "Last time better tha, quality gir gayi.", "Packaging was very poor, things leaked.",
    "Do not order from here again.", "Totally disappointed with the order.",
]

# -- Order Customer Notes -----------------------------------------
CUSTOMER_NOTES = [
    "", "", "", "",  # most orders have no notes
    "Please ring bell twice.", "Leave at door.",
    "Call before delivery.", "Please pack in separate bags.",
    "No plastic bag please.", "Urgent delivery needed.",
    "Gate pin: 1234", "Building 3rd floor, no lift.",
    "Cash ready at door.", "Send extra carry bag.",
    "Please add extra straw.", "Don't ring bell, baby sleeping.",
    "???? call ?????", "??? ?? ???? ?????",
]

# -- Delivery Addresses Pool --------------------------------------
ADDRESS_POOL = [
    "102, Patel Residency, Paldi, Ahmedabad - 380007",
    "A-12, Shaligram Flats, Vasna, Ahmedabad - 380007",
    "305, Rajmani Society, Shyamal, Ahmedabad - 380015",
    "B-7, Satellite Towers, Satellite, Ahmedabad - 380015",
    "15, Law Garden Apts, Ellisbridge, Ahmedabad - 380006",
    "42, Ambawadi Society, Ambawadi, Ahmedabad - 380006",
    "23, Gulbai Tekra Cross Rd, Ahmedabad - 380006",
    "67, Shivranjani Society, Ahmedabad - 380015",
    "9, Prahlad Nagar Complex, Ahmedabad - 380015",
    "401, Takshshila Apts, Paldi, Ahmedabad - 380007",
    "B-201, Nirakar Society, Shreyas, Ahmedabad - 380007",
    "501, Navrangpura Tower, Ahmedabad - 380009",
    "301, Vastrapur Lake View Apts, Ahmedabad - 380054",
    "102, Bodakdev Heights, Ahmedabad - 380054",
    "15, Maninagar Cross Rd, Ahmedabad - 380008",
    "C-3, Bhagirath Society, Vasna, Ahmedabad - 380007",
    "7, Parvatinagar, 100 Ft Rd, Satellite, Ahmedabad - 380015",
    "A-403, Gota Greens, Ahmedabad - 382481",
    "22, Chandkheda Scheme, Ahmedabad - 382424",
    "Floor 2, Dev Arcade, Paldi, Ahmedabad - 380007",
]


def rand_coord(base, spread, rng):
    return round(base + rng.uniform(-spread, spread), 6)


class Command(BaseCommand):
    help = "Seed master dataset: 150 customers, 20 riders, 7000-9000 orders, reviews, coupons, forecasts, notifications"

    def add_arguments(self, parser):
        parser.add_argument("--orders", type=int, default=8000, help="Target number of orders (7000-9000)")
        parser.add_argument("--seed",   type=int, default=2025)
        parser.add_argument("--customers", type=int, default=150)
        parser.add_argument("--skip-orders", action="store_true", help="Skip order generation (run other seeds only)")

    # ------------------------------------------------------------
    def handle(self, *args, **options):
        import sys, io
        # Force UTF-8 on Windows cp1252 terminals
        if hasattr(sys.stdout, 'reconfigure'):
            try:
                sys.stdout.reconfigure(encoding='utf-8', errors='replace')
            except Exception:
                pass

        self.rng = random.Random(options["seed"])
        self.now = timezone.now()
        self.today = self.now.date()

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== DigiBazaar Master Data Seeder ==="))
        self.stdout.write(f"   Seed={options['seed']}  Target orders={options['orders']}")

        # Run each step independently — no single outer atomic block.
        # This prevents a failure in one step from poisoning subsequent steps.
        self._ensure_categories()
        customers, customer_users = self._seed_customers(options["customers"])
        riders = self._seed_riders()
        shops = list(Shop.objects.prefetch_related("products").all())

        if not shops:
            self.stderr.write("[ERROR] No shops found. Run seed_shops first, then re-run.")
            return

        all_products = list(Product.objects.filter(status="active").all())
        if not all_products:
            self.stderr.write("[ERROR] No active products. Run import_zepto_products first.")
            return

        if not options["skip_orders"]:
            self._seed_orders(
                options["orders"], customers, riders, shops, all_products
            )

        self._seed_coupons(shops)
        self._seed_search_history(customer_users)
        self._seed_demand_forecasts(shops, all_products)
        self._seed_notifications(customer_users, riders, shops)
        self._update_shop_metrics(shops)
        self._update_customer_metrics(customers)

        self.stdout.write(self.style.SUCCESS("\n[OK]  Master seed complete!\n"))

    # -- 1. Ensure base categories exist -------------------------
    def _ensure_categories(self):
        categories = [
            ("Grocery",       "grocery"),
            ("Dairy",         "dairy"),
            ("Beverages",     "beverages"),
            ("Snacks",        "snacks"),
            ("Bakery",        "bakery"),
            ("Health",        "health"),
            ("Personal Care", "personal-care"),
            ("Household",     "household"),
            ("Baby Care",     "baby-care"),
            ("Clothing",      "clothing"),
            ("Fashion",       "fashion"),
            ("Electronics",   "electronics"),
            ("Pet Food",      "pet-food"),
            ("Fruits",        "fruits"),
            ("Vegetables",    "vegetables"),
        ]
        for name, slug in categories:
            Category.objects.get_or_create(slug=slug, defaults={"name": name, "is_active": True})
        self.stdout.write("  ? Categories ensured")

    # -- 2. Seed 150 Customers ------------------------------------
    def _seed_customers(self, count):
        self.stdout.write(f"\n[GRP]  Seeding {count} customers...")
        customers = []
        customer_users = []
        rng = self.rng

        SEGMENTS = [
            "Platinum Super-Buyer", "Gold Regular", "Silver Active",
            "Bronze Newcomer", "At Risk", "Hibernating", "Lost",
        ]
        SEG_WEIGHTS = [5, 15, 25, 20, 15, 12, 8]

        for i in range(count):
            gender = rng.choice(["M", "F"])
            first = rng.choice(FIRST_NAMES_MALE if gender == "M" else FIRST_NAMES_FEMALE)
            last  = rng.choice(LAST_NAMES)
            full_name = f"{first} {last}"
            phone = f"9{rng.randint(100000000, 999999999)}"
            username = f"cust_{phone}"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{first.lower()}.{last.lower()}{i}@gmail.com",
                    "first_name": first,
                    "last_name": last,
                },
            )
            if created:
                user.set_password("OTPVerified123!")
                user.save()

            UserProfile.objects.get_or_create(
                user=user,
                defaults={"phone": phone, "full_name": full_name},
            )

            purchase_count = rng.randint(2, 120)
            avg_order      = round(rng.uniform(120, 950), 2)
            total_spent    = round(purchase_count * avg_order, 2)

            customer, _ = Customer.objects.update_or_create(
                user=user,
                defaults={
                    "purchase_count":      purchase_count,
                    "total_spent":         Decimal(str(total_spent)),
                    "average_order_value": Decimal(str(avg_order)),
                    "lifetime_value":      Decimal(str(round(total_spent * rng.uniform(1.1, 1.4), 2))),
                    "repeat_rate":         Decimal(str(round(rng.uniform(10, 90), 2))),
                    "wallet_balance":      Decimal(str(round(rng.uniform(0, 750), 2))),
                    "loyalty_points":      rng.randint(0, 5000),
                    "segment":             rng.choices(SEGMENTS, weights=SEG_WEIGHTS, k=1)[0],
                    "favorite_categories": rng.sample(
                        ["grocery","dairy","snacks","beverages","personal-care",
                         "household","bakery","fruits","vegetables","health"],
                        k=rng.randint(2, 5),
                    ),
                    "last_order_date": self.now - timedelta(days=rng.randint(0, 90)),
                },
            )

            # 1-3 addresses per customer
            area_count = rng.randint(1, 3)
            chosen_areas = rng.sample(AREAS, min(area_count, len(AREAS)))
            for j, (area_name, pin, lat_b, lon_b, lat_s, lon_s) in enumerate(chosen_areas):
                lat = rand_coord(lat_b, lat_s, rng)
                lon = rand_coord(lon_b, lon_s, rng)
                addr = rng.choice(ADDRESS_POOL)
                CustomerAddress.objects.get_or_create(
                    customer=customer,
                    full_address=addr,
                    defaults={
                        "label": "home" if j == 0 else rng.choice(["work", "other"]),
                        "city": "Ahmedabad",
                        "pincode": pin,
                        "lat":  Decimal(str(lat)),
                        "long": Decimal(str(lon)),
                        "is_default": j == 0,
                    },
                )

            customers.append(customer)
            customer_users.append(user)

        self.stdout.write(self.style.SUCCESS(f"   ? {count} customers seeded"))
        return customers, customer_users

    # -- 3. Seed 20 Riders ----------------------------------------
    def _seed_riders(self):
        self.stdout.write("\n[~]  Seeding 20 riders...")
        riders = []
        rng = self.rng

        for i, rd in enumerate(RIDER_DATA):
            username = f"rider_{rd['phone']}"
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"rider{i+1}@digibazaar.in",
                    "first_name": rd["name"].split()[0],
                    "last_name":  rd["name"].split()[-1],
                },
            )
            if created:
                user.set_password("OTPVerified123!")
                user.save()

            # Assign zone lat/lon
            area_info = AREAS[i % len(AREAS)]
            lat_b, lon_b = area_info[2], area_info[3]

            total_deliveries = rng.randint(50, 4500)
            avg_per_delivery = rng.uniform(25, 60)  # INR per delivery (platform fee)
            total_earnings   = round(total_deliveries * avg_per_delivery, 2)

            rider, _ = Rider.objects.update_or_create(
                user=user,
                defaults={
                    "phone":            rd["phone"],
                    "full_name":        rd["name"],
                    "is_online":        rng.choice([True, True, True, False]),  # 75% online
                    "lat":              Decimal(str(rand_coord(lat_b, 0.01, rng))),
                    "long":             Decimal(str(rand_coord(lon_b, 0.01, rng))),
                    "rating":           Decimal(str(round(rng.uniform(3.8, 5.0), 2))),
                    "vehicle_type":     rd["vehicle"],
                    "vehicle_number":   rd["plate"],
                    "total_deliveries": total_deliveries,
                    "total_earnings":   Decimal(str(total_earnings)),
                },
            )
            riders.append(rider)

        self.stdout.write(self.style.SUCCESS(f"   ? {len(riders)} riders seeded"))
        return riders

    # -- 4. Seed 7000-9000 Orders ---------------------------------
    def _seed_orders(self, target_count, customers, riders, shops, all_products):
        self.stdout.write(f"\n[PKG]  Seeding {target_count} orders (this may take a minute)...")
        rng = self.rng
        now = self.now

        # Clear existing orders so metrics are clean
        self.stdout.write("   Clearing existing orders...")
        Order.objects.all().delete()

        # Pre-build shop?products mapping
        shop_products = {}
        for shop in shops:
            prods = list(shop.products.filter(status="active").all())
            if not prods:
                prods = rng.sample(all_products, min(15, len(all_products)))
            shop_products[shop.id] = prods

        # Status distribution weighted for realism
        STATUS_POOL    = ["completed", "completed", "completed", "completed",
                          "delivered", "out_for_delivery", "preparing", "ready",
                          "accepted", "pending", "cancelled", "rejected"]
        STATUS_WEIGHTS = [30, 25, 15, 10, 5, 4, 3, 2, 2, 2, 1, 1]

        FULFILLMENT_POOL    = ["digibazaar_delivery", "digibazaar_delivery", "pickup", "shop_delivery"]
        FULFILLMENT_WEIGHTS = [55, 25, 12, 8]

        PAYMENT_METHODS = ["cod", "upi", "upi", "card", "wallet", "netbanking"]
        PAY_WEIGHTS     = [35, 35, 10, 10, 5, 5]

        PAYMENT_STATUS_MAP = {
            "completed":       ("paid",    0.98),
            "delivered":       ("paid",    0.95),
            "out_for_delivery":("paid",    0.70),
            "preparing":       ("paid",    0.50),
            "ready":           ("paid",    0.45),
            "accepted":        ("pending", 0.80),
            "pending":         ("pending", 0.90),
            "cancelled":       ("failed",  0.60),
            "rejected":        ("pending", 0.95),
            "picked_up":       ("paid",    0.80),
        }

        # Hour-of-day weights to simulate real Indian peak hours
        # Peak: 8-10am (breakfast), 12-2pm (lunch), 5-8pm (evening), 9-10pm (night)
        HOUR_WEIGHTS = [
            1, 1, 0, 0, 0, 1,   # 0-5
            2, 4, 8, 9, 6, 5,   # 6-11
            8, 9, 7, 5, 6, 10,  # 12-17
            12, 11, 9, 8, 5, 2, # 18-23
        ]

        order_batch = []
        item_batch  = []
        timeline_batch = []
        assignment_batch = []

        created_count = 0
        batch_size = 500

        for i in range(target_count):
            customer = rng.choice(customers)
            shop     = rng.choice(shops)
            prods    = shop_products.get(shop.id, all_products)

            status = rng.choices(STATUS_POOL, weights=STATUS_WEIGHTS, k=1)[0]
            fulfillment = rng.choices(FULFILLMENT_POOL, weights=FULFILLMENT_WEIGHTS, k=1)[0]
            payment_method = rng.choices(PAYMENT_METHODS, weights=PAY_WEIGHTS, k=1)[0]

            # Payment status
            ps_status, ps_paid_prob = PAYMENT_STATUS_MAP.get(status, ("pending", 0.5))
            payment_status = ps_status if rng.random() < ps_paid_prob else "pending"

            # Time spread over last 365 days, realistic hour distribution
            days_ago = rng.randint(0, 364)
            hour = rng.choices(range(24), weights=HOUR_WEIGHTS, k=1)[0]
            minute = rng.randint(0, 59)
            placed_at = now - timedelta(days=days_ago, hours=(now.hour - hour) % 24, minutes=minute)

            # Order timeline timestamps
            accepted_at = preparing_at = ready_at = picked_up_at = delivered_at = cancelled_at = None
            prep_mins = delivery_mins = None

            if status not in ("pending", "rejected", "cancelled"):
                accepted_at = placed_at + timedelta(minutes=rng.randint(1, 8))
            if status in ("preparing", "ready", "picked_up", "out_for_delivery", "delivered", "completed"):
                preparing_at = accepted_at + timedelta(minutes=rng.randint(1, 5))
            if status in ("ready", "picked_up", "out_for_delivery", "delivered", "completed"):
                prep_mins = rng.randint(8, 30)
                ready_at  = preparing_at + timedelta(minutes=prep_mins)
            if status in ("picked_up", "out_for_delivery", "delivered", "completed") and fulfillment != "pickup":
                picked_up_at = ready_at + timedelta(minutes=rng.randint(2, 10))
            if status in ("delivered", "completed") and fulfillment != "pickup":
                delivery_mins = rng.randint(10, 45)
                delivered_at  = (picked_up_at or ready_at) + timedelta(minutes=delivery_mins)
            if status == "cancelled":
                cancelled_at = placed_at + timedelta(minutes=rng.randint(1, 20))

            # Products selection (1-5 items, co-purchase patterns)
            num_items = rng.choices([1, 2, 3, 4, 5], weights=[25, 30, 25, 12, 8], k=1)[0]
            selected_prods = rng.sample(prods, min(num_items, len(prods)))

            # Financials
            subtotal = Decimal("0")
            items_data = []
            for prod in selected_prods:
                qty   = rng.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5], k=1)[0]
                price = prod.selling_price or prod.price or Decimal("50")
                disc  = (price * Decimal(str(round(rng.uniform(0, 0.15), 2)))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                items_data.append((prod, qty, price, disc))
                subtotal += (price - disc) * qty

            delivery_charge = Decimal("0")
            if fulfillment == "digibazaar_delivery":
                delivery_charge = Decimal("0") if subtotal >= 500 else Decimal(str(rng.choice([25, 30, 35, 40])))

            # Coupon discount (20% of orders)
            coupon_code = ""
            coupon_disc = Decimal("0")
            if rng.random() < 0.20 and subtotal > 0:
                disc_pct  = rng.choice([5, 10, 15, 20])
                coupon_disc = (subtotal * Decimal(str(disc_pct)) / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                coupon_code = f"SAVE{disc_pct}"

            tax_rate   = Decimal("0.05")  # 5% GST
            taxable    = subtotal - coupon_disc
            tax_amount = (taxable * tax_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total      = (taxable + delivery_charge + tax_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            total      = max(total, Decimal("0"))

            # ML delivery recommendation
            ml_mode = "pickup" if subtotal < 200 else "digibazaar_delivery"
            ml_conf = Decimal(str(round(rng.uniform(62, 97), 2)))

            # Assign rider for delivery orders
            rider = None
            if fulfillment == "digibazaar_delivery" and status in ("out_for_delivery", "delivered", "completed", "picked_up"):
                rider = rng.choice(riders)

            # Cancellation reason
            cancel_reason = ""
            if status == "cancelled":
                cancel_reason = rng.choice([
                    "customer_request", "shop_rejected", "auto_timeout",
                    "out_of_stock", "payment_failed", "delivery_issue"
                ])

            invoice_num = f"INV-{placed_at.strftime('%Y%m')}-{i+1:06d}" if status in ("delivered", "completed") else ""

            # Pick customer address
            area_info = rng.choice(AREAS)
            cust_lat = rand_coord(area_info[2], area_info[4], rng)
            cust_lon = rand_coord(area_info[3], area_info[5], rng)

            order = Order(
                user=customer.user,
                shop=shop,
                status=status,
                fulfillment_option=fulfillment,
                delivery_address=rng.choice(ADDRESS_POOL),
                lat=Decimal(str(cust_lat)),
                long=Decimal(str(cust_lon)),
                rider=rider,
                subtotal=subtotal,
                recommended_delivery_mode=ml_mode,
                delivery_mode_confidence=ml_conf,
                delivery_charge=delivery_charge,
                discount_amount=coupon_disc,
                tax_amount=tax_amount,
                total_amount=total,
                payment_status=payment_status,
                payment_method=payment_method,
                payment_gateway_id=f"PGW{rng.randint(1000000, 9999999)}" if payment_method != "cod" else "",
                transaction_id=f"TXN{rng.randint(10000000, 99999999)}" if payment_status == "paid" else "",
                coupon_code=coupon_code,
                coupon_discount=coupon_disc,
                accepted_at=accepted_at,
                preparing_at=preparing_at,
                ready_at=ready_at,
                picked_up_at=picked_up_at,
                delivered_at=delivered_at,
                cancelled_at=cancelled_at,
                preparation_time_mins=prep_mins,
                delivery_time_mins=delivery_mins,
                cancellation_reason=cancel_reason,
                refund_status="refunded" if (status == "cancelled" and payment_status == "paid" and rng.random() < 0.7) else "",
                refund_amount=(total * Decimal("0.9")) if (status == "cancelled" and payment_status == "paid" and rng.random() < 0.7) else Decimal("0"),
                invoice_number=invoice_num,
                invoice_generated=bool(invoice_num),
                customer_notes=rng.choice(CUSTOMER_NOTES),
            )
            order_batch.append((order, items_data, placed_at, rider))

            if len(order_batch) >= batch_size or i == target_count - 1:
                # Bulk create orders
                orders_to_create = [o for o, _, _, _ in order_batch]
                created_orders = Order.objects.bulk_create(orders_to_create)

                # Now set placed_at (auto_now_add workaround via update)
                for idx, (order_obj, items_data, placed_at_val, rider_obj) in enumerate(order_batch):
                    created_order = created_orders[idx]

                    # Override timestamps
                    Order.objects.filter(pk=created_order.pk).update(
                        created_at=placed_at_val,
                        updated_at=placed_at_val,
                    )

                    # Build OrderItems
                    for prod, qty, price, disc in items_data:
                        item_batch.append(OrderItem(
                            order=created_order,
                            product=prod,
                            quantity=qty,
                            price_at_order=price,
                            discount_at_order=disc,
                        ))

                    # Build timeline entries
                    status_val = created_order.status
                    ts = placed_at_val
                    timeline_batch.append(OrderTimeline(order=created_order, status="pending", timestamp=ts))
                    if status_val not in ("pending", "rejected"):
                        ts = ts + timedelta(minutes=rng.randint(1, 8))
                        timeline_batch.append(OrderTimeline(order=created_order, status="accepted", timestamp=ts))
                    if status_val in ("preparing", "ready", "picked_up", "out_for_delivery", "delivered", "completed"):
                        ts = ts + timedelta(minutes=rng.randint(1, 5))
                        timeline_batch.append(OrderTimeline(order=created_order, status="preparing", timestamp=ts))
                    if status_val in ("ready", "picked_up", "out_for_delivery", "delivered", "completed"):
                        ts = ts + timedelta(minutes=rng.randint(8, 30))
                        timeline_batch.append(OrderTimeline(order=created_order, status="ready", timestamp=ts))
                    if status_val in ("out_for_delivery", "delivered", "completed") and created_order.fulfillment_option != "pickup":
                        ts = ts + timedelta(minutes=rng.randint(2, 10))
                        timeline_batch.append(OrderTimeline(order=created_order, status="out_for_delivery", timestamp=ts))
                    if status_val in ("delivered", "completed"):
                        ts = ts + timedelta(minutes=rng.randint(10, 45))
                        timeline_batch.append(OrderTimeline(order=created_order, status="delivered", timestamp=ts))
                        if status_val == "completed":
                            ts = ts + timedelta(minutes=rng.randint(1, 30))
                            timeline_batch.append(OrderTimeline(order=created_order, status="completed", timestamp=ts))
                    if status_val == "cancelled":
                        ts_c = placed_at_val + timedelta(minutes=rng.randint(1, 20))
                        timeline_batch.append(OrderTimeline(order=created_order, status="cancelled", timestamp=ts_c))

                    # Delivery assignment
                    if rider_obj and status_val in ("out_for_delivery", "delivered", "completed", "picked_up"):
                        dist_km = round(rng.uniform(0.5, 7.5), 2)
                        assign_status = "delivered" if status_val in ("delivered", "completed") else "assigned"
                        assignment_batch.append(DeliveryAssignment(
                            order=created_order,
                            rider=rider_obj,
                            status=assign_status,
                            eta=rng.randint(8, 40),
                            actual_delivery_time_mins=created_order.delivery_time_mins,
                            distance_km=Decimal(str(dist_km)),
                        ))

                # Bulk insert items, timelines, assignments
                OrderItem.objects.bulk_create(item_batch, ignore_conflicts=False)
                OrderTimeline.objects.bulk_create(timeline_batch, ignore_conflicts=False)
                DeliveryAssignment.objects.bulk_create(assignment_batch, ignore_conflicts=False)

                created_count += len(order_batch)
                self.stdout.write(f"   ... {created_count}/{target_count} orders created")

                order_batch.clear()
                item_batch.clear()
                timeline_batch.clear()
                assignment_batch.clear()

        self.stdout.write(self.style.SUCCESS(f"   ? {created_count} orders seeded with items, timelines, assignments"))

        # Seed reviews for completed orders
        self._seed_reviews_from_orders()

    # -- 5. Seed Reviews ------------------------------------------
    def _seed_reviews_from_orders(self):
        self.stdout.write("\n[*]  Seeding reviews for completed orders...")
        rng = self.rng
        Review.objects.all().delete()

        # 40% of completed orders get a review
        completed_orders = list(
            Order.objects.filter(status__in=["completed", "delivered"])
                         .select_related("user", "shop")
                         .prefetch_related("items__product")[:5000]
        )
        review_orders = rng.sample(completed_orders, min(int(len(completed_orders) * 0.40), len(completed_orders)))

        reviews = []
        for order in review_orders:
            rating = rng.choices([5, 4, 3, 2, 1], weights=[40, 30, 15, 10, 5], k=1)[0]
            if rating >= 4:
                comment = rng.choice(POSITIVE_REVIEWS)
                title = rng.choice(["Great!", "Highly Recommend!", "Loved it!", "Excellent!", "5 Stars!"])
            elif rating == 3:
                comment = rng.choice(NEUTRAL_REVIEWS)
                title = rng.choice(["Average", "Okay", "Decent", "Could be better"])
            else:
                comment = rng.choice(NEGATIVE_REVIEWS)
                title = rng.choice(["Disappointed", "Not good", "Poor quality", "Bad experience"])

            # Get a product from the order
            items = list(order.items.all())
            product = items[0].product if items else None

            reviews.append(Review(
                user=order.user,
                shop=order.shop,
                product=product,
                order=order,
                rating=rating,
                title=title,
                comment=comment,
                is_verified_purchase=True,
                helpful_count=rng.randint(0, 50),
                is_visible=True,
            ))

        Review.objects.bulk_create(reviews, ignore_conflicts=True)

        # Update shop ratings
        from django.db.models import Avg, Count
        for shop in Shop.objects.all():
            agg = Review.objects.filter(shop=shop).aggregate(avg=Avg("rating"), cnt=Count("id"))
            if agg["avg"]:
                Shop.objects.filter(pk=shop.pk).update(
                    rating=Decimal(str(round(agg["avg"], 2))),
                    review_count=agg["cnt"],
                )

        self.stdout.write(self.style.SUCCESS(f"   ? {len(reviews)} reviews seeded"))

    # -- 6. Seed Coupons per shop ---------------------------------
    def _seed_coupons(self, shops):
        self.stdout.write("\n[TAG]?  Seeding coupons...")
        rng = self.rng
        Coupon.objects.all().delete()

        coupons = []
        for shop in shops:
            # Each shop gets 3-6 coupons
            num_coupons = rng.randint(3, 6)
            for j in range(num_coupons):
                disc_type = rng.choice(["percentage", "percentage", "flat"])
                disc_val  = rng.choice([5, 10, 15, 20, 25, 50, 100, 150]) if disc_type == "flat" else rng.choice([5, 10, 12, 15, 20, 25])
                # Always embed shop.id + j to guarantee global uniqueness
                prefix_map = {
                    0: f"SAVE{disc_val}",
                    1: f"FIRST{disc_val}OFF",
                    2: f"DIGI{disc_val}",
                    3: f"WINBACK",
                    4: f"FLASH{disc_val}",
                    5: f"WKND{disc_val}",
                }
                prefix = prefix_map.get(j, f"PROMO{disc_val}")
                # Unique suffix: shop_id + slot index + random 3-digit to avoid any collision
                code = f"{prefix}_S{shop.id}_{j}_{rng.randint(100,999)}"[:50]

                # Some expired, some active
                is_active = rng.random() < 0.65
                days_offset = rng.randint(-30, 30)
                valid_from  = self.now - timedelta(days=rng.randint(10, 60))
                valid_until = self.now + timedelta(days=days_offset)

                # Use savepoint so IntegrityError on dup code doesn't break outer transaction
                try:
                    with transaction.atomic():
                        c = Coupon.objects.create(
                            code=code,
                            description=f"{disc_val}{'%' if disc_type=='percentage' else 'Rs.'} off on orders above Rs.{rng.choice([99, 199, 299, 499])}",
                            discount_type=disc_type,
                            discount_value=Decimal(str(disc_val)),
                            min_order_value=Decimal(str(rng.choice([99, 149, 199, 299, 399, 499]))),
                            max_discount=Decimal(str(rng.choice([50, 75, 100, 150, 200]))) if disc_type == "percentage" else None,
                            valid_from=valid_from,
                            valid_until=valid_until,
                            usage_limit=rng.choice([0, 50, 100, 200, 500]),
                            used_count=rng.randint(0, 80),
                            per_user_limit=rng.choice([1, 2, 3]),
                            is_active=is_active,
                        )
                        c.applicable_shops.add(shop)
                        coupons.append(c)
                except Exception:
                    pass  # skip on duplicate code (rare now with unique suffix)

        self.stdout.write(self.style.SUCCESS(f"   ? {len(coupons)} coupons seeded"))

    # -- 7. Seed Search History (MarketSearchTrend) ---------------
    def _seed_search_history(self, customer_users):
        self.stdout.write("\n[?]  Seeding search trends & wishlist...")
        rng = self.rng

        # Update MarketSearchTrend scores
        MarketSearchTrend.objects.all().delete()
        trend_data = []
        for kw in SEARCH_KEYWORDS:
            trend_data.append(MarketSearchTrend(
                keyword=kw,
                trend_score=rng.randint(50, 10000),
            ))
        MarketSearchTrend.objects.bulk_create(trend_data, ignore_conflicts=True)

        # Seed Wishlist items per customer (5-20 items each)
        all_products = list(Product.objects.filter(status="active")[:200])
        Wishlist.objects.all().delete()
        wishlist_batch = []
        seen = set()
        for user in customer_users:
            n_wish = rng.randint(3, 15)
            prods = rng.sample(all_products, min(n_wish, len(all_products)))
            for prod in prods:
                key = (user.id, prod.id)
                if key not in seen:
                    seen.add(key)
                    wishlist_batch.append(Wishlist(user=user, product=prod))

        Wishlist.objects.bulk_create(wishlist_batch, ignore_conflicts=True)
        self.stdout.write(self.style.SUCCESS(f"   ? {len(trend_data)} search trends, {len(wishlist_batch)} wishlist items"))

    # -- 8. Seed Demand Forecasts ---------------------------------
    def _seed_demand_forecasts(self, shops, all_products):
        self.stdout.write("\n[UP]  Seeding demand forecasts (ML predictions)...")
        rng = self.rng
        DemandForecast.objects.all().delete()

        forecast_batch = []
        today = self.today

        # For each shop, pick 10 top products and forecast last 90 days
        for shop in shops:
            shop_prods = list(shop.products.filter(status="active").all()[:15])
            if not shop_prods:
                shop_prods = rng.sample(all_products, min(10, len(all_products)))

            for prod in shop_prods:
                # Simulate daily demand with seasonality
                base_demand = rng.uniform(2, 30)
                for day_offset in range(90):
                    forecast_date = today - timedelta(days=day_offset)
                    # Weekend boost
                    weekday = forecast_date.weekday()
                    weekend_mult = 1.3 if weekday >= 5 else 1.0
                    # Monthly cycle
                    day_of_month = forecast_date.day
                    month_mult = 1.2 if day_of_month <= 5 else (1.1 if day_of_month >= 25 else 1.0)
                    # Random variation
                    noise = rng.gauss(0, 0.15)
                    predicted = max(0, base_demand * weekend_mult * month_mult * (1 + noise))
                    actual    = max(0, predicted * rng.uniform(0.7, 1.3)) if day_offset > 0 else None

                    forecast_batch.append(DemandForecast(
                        shop=shop,
                        product=prod,
                        date=forecast_date,
                        predicted_quantity=round(predicted, 2),
                        actual_quantity=round(actual, 2) if actual is not None else None,
                        mae=round(rng.uniform(0.5, 3.0), 3),
                        mse=round(rng.uniform(1.0, 8.0), 3),
                        r2_score=round(rng.uniform(0.70, 0.95), 4),
                    ))

            if len(forecast_batch) >= 5000:
                DemandForecast.objects.bulk_create(forecast_batch, ignore_conflicts=True)
                forecast_batch.clear()

        if forecast_batch:
            DemandForecast.objects.bulk_create(forecast_batch, ignore_conflicts=True)

        total = DemandForecast.objects.count()
        self.stdout.write(self.style.SUCCESS(f"   ? {total} demand forecasts seeded"))

    # -- 9. Seed Notifications (role-personalized) ----------------
    def _seed_notifications(self, customer_users, riders, shops):
        self.stdout.write("\n[!]  Seeding notifications (customer / shop / rider)...")
        rng = self.rng
        Notification.objects.all().delete()
        notifs = []

        # -- Customer notifications --
        customer_notif_templates = [
            ("Your order has been accepted! ?", "order_update", "success",
             "Your order #{oid} from {shop} has been accepted and is being prepared."),
            ("Order out for delivery [~]", "order_update", "info",
             "Rider is on the way! Your order #{oid} will arrive in {eta} minutes."),
            ("Order delivered successfully [OK]", "order_update", "success",
             "Your order from {shop} has been delivered. Rate your experience!"),
            ("Flash Sale Alert! [HOT]", "promotion", "warning",
             "20% off on grocery orders above Rs.499 today only. Use code FLASH20."),
            ("New coupon for you! [GFT]", "promotion", "info",
             "Exclusive 15% off coupon: SAVE15. Valid for 48 hours."),
            ("Low wallet balance Rs.{bal}", "payment", "warning",
             "Your wallet balance is Rs.{bal}. Add money to enjoy faster checkout."),
            ("Order cancelled", "order_update", "urgent",
             "Your order #{oid} was cancelled. Refund will be processed in 3-5 days."),
            ("Rate your last order [*]", "review", "info",
             "How was your order from {shop}? Share your feedback."),
            ("Rs.50 cashback credited [MNY]", "payment", "success",
             "Rs.50 cashback for your 10th order has been credited to your wallet!"),
            ("Back in stock! [PKG]", "order_update", "info",
             "Amul Gold 1L milk is back in stock at {shop}. Order now!"),
        ]

        for user in customer_users[:100]:  # Top 100 customers
            num_notifs = rng.randint(3, 12)
            templates = rng.sample(customer_notif_templates, min(num_notifs, len(customer_notif_templates)))
            for tmpl in templates:
                title, notif_type, severity, msg = tmpl
                shop = rng.choice(shops)
                msg_filled = msg.format(oid=rng.randint(1000, 9999), shop=shop.name, eta=rng.randint(10, 35), bal=rng.randint(20, 150))
                created_at = self.now - timedelta(days=rng.randint(0, 30), hours=rng.randint(0, 23))
                notifs.append(Notification(
                    user=user,
                    title=title,
                    message=msg_filled,
                    notification_type=notif_type,
                    severity=severity,
                    is_read=rng.random() < 0.65,
                    metadata={"order_id": rng.randint(1, 9999), "shop_id": shop.id},
                ))

        # -- Shop owner notifications --
        owner_notif_templates = [
            ("New order received! [IN]", "order_new", "urgent",
             "Order #{oid} received for Rs.{amt}. Accept within 90 seconds!"),
            ("Low stock alert ??", "low_stock", "warning",
             "{product} is running low -- only {qty} units left. Restock now."),
            ("Out of stock! ?", "out_of_stock", "urgent",
             "{product} is out of stock. Customers cannot order this item."),
            ("Daily revenue: Rs.{amt} [CHR]", "system", "info",
             "Today's revenue so far is Rs.{amt}. {orders} orders completed."),
            ("Order cancelled by customer", "order_update", "warning",
             "Order #{oid} was cancelled by the customer before preparation."),
            ("New 5-star review [*][*][*][*][*]", "review", "success",
             "A customer left a 5-star review: 'Bahut acha product hai!'"),
            ("ML Insight: Peak hour ahead [ML]", "ai_insight", "info",
             "ML predicts 35% higher demand between 6-8 PM today. Stock up!"),
            ("Coupon performance update [BAR]", "promotion", "info",
             "SAVE15 coupon redeemed 42 times. Rs.6,300 extra revenue generated."),
            ("Payment settled Rs.{amt} [OK]", "payment", "success",
             "Rs.{amt} has been settled to your bank account ending XXXX."),
            ("Inventory expiry alert [CAL]", "ai_insight", "warning",
             "3 items expiring within 2 days. Recommend 25% clearance sale."),
        ]

        for shop in shops:
            owner_user = shop.owner.user
            num_notifs = rng.randint(5, 15)
            templates = rng.sample(owner_notif_templates, min(num_notifs, len(owner_notif_templates)))
            for tmpl in templates:
                title, notif_type, severity, msg = tmpl
                products = list(shop.products.all()[:5])
                product_name = products[0].name if products else "Amul Milk"
                msg_filled = msg.format(
                    oid=rng.randint(1000, 9999),
                    amt=rng.randint(500, 15000),
                    qty=rng.randint(1, 8),
                    product=product_name,
                    orders=rng.randint(5, 40),
                )
                notifs.append(Notification(
                    user=owner_user,
                    title=title,
                    message=msg_filled,
                    notification_type=notif_type,
                    severity=severity,
                    is_read=rng.random() < 0.50,
                    metadata={"shop_id": shop.id, "order_id": rng.randint(1, 9999)},
                ))

        # -- Rider notifications --
        rider_notif_templates = [
            ("New delivery request! [~]", "order_new", "urgent",
             "Order #{oid} from {shop}. Distance: {dist} km. Accept now!"),
            ("Delivery completed [OK]", "order_update", "success",
             "Order #{oid} delivered. Rs.{earn} added to your earnings today."),
            ("Customer tip received [MNY]", "payment", "success",
             "Rs.{tip} tip received for Order #{oid}. Great job!"),
            ("Low battery warning [!]", "system", "warning",
             "Your phone battery is below 15%. Plug in to stay connected."),
            ("Peak hours bonus! [HOT]", "promotion", "success",
             "Earn 1.5x commission for deliveries between 7-9 PM tonight!"),
            ("Daily earnings: Rs.{earn} [BAR]", "system", "info",
             "You've completed {deliveries} deliveries today. Total: Rs.{earn}"),
            ("New zone assigned ?", "system", "info",
             "You've been assigned to the {area} delivery zone for today."),
            ("Rating updated [*]", "review", "info",
             "Your new average rating is {rating}/5.0 from recent deliveries."),
        ]

        for rider in riders:
            num_notifs = rng.randint(4, 12)
            templates = rng.sample(rider_notif_templates, min(num_notifs, len(rider_notif_templates)))
            for tmpl in templates:
                title, notif_type, severity, msg = tmpl
                shop = rng.choice(shops)
                area = rng.choice(AREAS)[0]
                msg_filled = msg.format(
                    oid=rng.randint(1000, 9999),
                    shop=shop.name,
                    dist=round(rng.uniform(0.5, 7.5), 1),
                    earn=rng.randint(30, 500),
                    tip=rng.choice([10, 20, 30, 50]),
                    deliveries=rng.randint(5, 25),
                    area=area,
                    rating=round(rng.uniform(3.8, 5.0), 1),
                )
                notifs.append(Notification(
                    user=rider.user,
                    title=title,
                    message=msg_filled,
                    notification_type=notif_type,
                    severity=severity,
                    is_read=rng.random() < 0.60,
                    metadata={"order_id": rng.randint(1, 9999), "rider_id": rider.id},
                ))

        Notification.objects.bulk_create(notifs, ignore_conflicts=False)
        self.stdout.write(self.style.SUCCESS(f"   ? {len(notifs)} notifications seeded (customer/shop/rider)"))

    # -- 10. Update Shop metrics ----------------------------------
    def _update_shop_metrics(self, shops):
        self.stdout.write("\n[BAR]  Updating shop metrics from orders...")
        from django.db.models import Count, Sum
        for shop in shops:
            agg = Order.objects.filter(
                shop=shop, status__in=["completed", "delivered"]
            ).aggregate(total=Count("id"), revenue=Sum("total_amount"))

            cancel_count = Order.objects.filter(shop=shop, status="cancelled").count()
            total = (agg["total"] or 0) + cancel_count
            cancel_rate = round(cancel_count / max(total, 1), 2)

            # Reliability: based on cancel rate
            reliability = round(max(0.5, 1.0 - cancel_rate * 2), 2)

            Shop.objects.filter(pk=shop.pk).update(
                total_orders_served=agg["total"] or 0,
                cancellation_rate=Decimal(str(cancel_rate)),
                reliability_score=Decimal(str(reliability)),
            )
        self.stdout.write(self.style.SUCCESS(f"   ? Shop metrics updated for {len(shops)} shops"))

    # -- 11. Update Customer metrics ------------------------------
    def _update_customer_metrics(self, customers):
        self.stdout.write("\n[USR]  Updating customer stats from real order data...")
        from django.db.models import Count, Sum, Avg, Max

        SEGMENTS = ["Platinum Super-Buyer", "Gold Regular", "Silver Active", "Bronze Newcomer", "At Risk", "Lost"]

        for cust in customers:
            agg = Order.objects.filter(
                user=cust.user, status__in=["completed", "delivered"]
            ).aggregate(
                cnt=Count("id"),
                total=Sum("total_amount"),
                avg=Avg("total_amount"),
                last=Max("created_at"),
            )
            cnt   = agg["cnt"] or 0
            total = agg["total"] or Decimal("0")
            avg   = agg["avg"] or Decimal("0")
            last  = agg["last"]

            # RFM-based segment
            if cnt >= 20 and total >= 10000:
                segment = "Platinum Super-Buyer"
            elif cnt >= 10 and total >= 4000:
                segment = "Gold Regular"
            elif cnt >= 5:
                segment = "Silver Active"
            elif cnt >= 1:
                segment = "Bronze Newcomer"
            elif last and (self.now - last).days > 60:
                segment = "At Risk"
            else:
                segment = "Lost"

            Customer.objects.filter(pk=cust.pk).update(
                purchase_count=cnt,
                total_spent=total,
                average_order_value=avg,
                lifetime_value=(total * Decimal("1.2")),
                last_order_date=last,
                segment=segment,
            )

        self.stdout.write(self.style.SUCCESS(f"   ? Customer metrics updated for {len(customers)} customers"))
