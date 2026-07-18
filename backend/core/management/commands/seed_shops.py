"""
seed_shops — Seed 36 real Ahmedabad stores with actual coordinates.

Replaces the dummy "Paldi Fresh Mart" data with verified shop names,
categories, lat/long from Paldi, Vasna, Satellite/Shyamal, and Ellisbridge.
"""

import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import (
    Category, Product, Shop, ShopOwner, ShopProduct,
    UserProfile, Rider, Order, OrderItem, DeliveryAssignment,
)

User = get_user_model()


# ── 36 Real Ahmedabad Stores ────────────────────────────────

REAL_STORES = [
    # --- PALDI (8 stores) ---
    {"name": "Jain Super Bazar", "type": "kirana", "lat": 23.0105, "long": 72.5612, "address": "38, Narayan Nagar Rd, Paldi", "area": "Paldi", "key_products": "Pulses, Grains, Organic Jaggery"},
    {"name": "Dhanlaxmi Gruh Udhyog", "type": "snacks", "lat": 23.0100, "long": 72.5605, "address": "Shop 1, Dev Status, Vikas Gruh Rd", "area": "Paldi", "key_products": "Jain Thepla, Khakhra, Pickles"},
    {"name": "Planet Health Paldi", "type": "medical", "lat": 23.0101, "long": 72.5606, "address": "Dev Status, Vikas Gruh Rd", "area": "Paldi", "key_products": "Medicines, Ortho Supports"},
    {"name": "Siddharth Provision", "type": "kirana", "lat": 23.0092, "long": 72.5585, "address": "Takshshila Apts, Jay Bhikkhu Marg", "area": "Paldi", "key_products": "Daily Grocery, Oil, Sugar"},
    {"name": "Urmi Sons", "type": "snacks", "lat": 23.0079, "long": 72.5537, "address": "Nirakar Society, Shreyas Bridge", "area": "Paldi", "key_products": "Masala, Dry Fruits, Mukhwas"},
    {"name": "KK General Store", "type": "kirana", "lat": 23.0098, "long": 72.5602, "address": "6, Vikas Gruh Rd, Paldi", "area": "Paldi", "key_products": "Soaps, Shampoos, Stationery"},
    {"name": "Nutan Medical", "type": "medical", "lat": 23.0055, "long": 72.5501, "address": "Zalak Complex, Anjali Cross Rd", "area": "Paldi", "key_products": "Generic Medicines, Baby Care"},
    {"name": "Vijay Stores", "type": "household", "lat": 23.0130, "long": 72.5645, "address": "Shop 24, Municipal Market, Paldi", "area": "Paldi", "key_products": "Steel Utensils, Plasticware"},

    # --- Additional Paldi ---
    {"name": "Jio Mart Paldi", "type": "kirana", "lat": 23.0056, "long": 72.5503, "address": "Yash Pinnacle, Anjali Cross Rd", "area": "Paldi", "key_products": "Groceries, FMCG, Household"},
    {"name": "Mahalaxmi Fruit Mart", "type": "kirana", "lat": 23.0150, "long": 72.5630, "address": "Lotus Park, Pritam Nagar, Paldi", "area": "Paldi", "key_products": "Fresh Fruits, Juices"},

    # --- VASNA (10 stores) ---
    {"name": "Neminath Provision", "type": "kirana", "lat": 23.0039, "long": 72.5460, "address": "Dave Shopping Centre, Barrage Rd", "area": "Vasna", "key_products": "Wheat, Rice, Besan, Maida"},
    {"name": "O My Dog Pet Shop", "type": "pet", "lat": 23.0042, "long": 72.5455, "address": "Sushmita Flats, Vasna Barrage", "area": "Vasna", "key_products": "Royal Canin, Pet Toys, Belts"},
    {"name": "Deendayal Medical", "type": "medical", "lat": 23.0025, "long": 72.5470, "address": "Bhagirath Society, Pravinnagar", "area": "Vasna", "key_products": "Prescription Drugs, Syrups"},
    {"name": "Parshwa Medical", "type": "medical", "lat": 22.9985, "long": 72.5435, "address": "Swaminarayan Park 1, Vishala", "area": "Vasna", "key_products": "Vitamins, First Aid, Balms"},
    {"name": "Vikram General Stores", "type": "kirana", "lat": 23.0052, "long": 72.5505, "address": "Dilip Centre, Anjali Char Rasta", "area": "Vasna", "key_products": "Cold Drinks, Wafers, Dairy"},
    {"name": "Annapurna Gen. Store", "type": "kirana", "lat": 22.9990, "long": 72.5440, "address": "Behind GB Shah College, Vasna", "area": "Vasna", "key_products": "Household Cleaners, Toiletries"},
    {"name": "Avkar Medical", "type": "medical", "lat": 23.0030, "long": 72.5465, "address": "ND Shroff Market, Vasna", "area": "Vasna", "key_products": "Medicines, Medical Supplies"},
    {"name": "Darshan Medical", "type": "medical", "lat": 23.0031, "long": 72.5466, "address": "C-1, ND Shroff Market, Vasna", "area": "Vasna", "key_products": "Prescription Medicines, Health"},
    {"name": "Paresh Provision", "type": "kirana", "lat": 23.0012, "long": 72.5448, "address": "Chandrika Shopping Center, Vasna", "area": "Vasna", "key_products": "Daily Essentials, Groceries"},
    {"name": "Pannalal Kirana", "type": "kirana", "lat": 23.0025, "long": 72.5472, "address": "355, Pravinnagar, Vasna", "area": "Vasna", "key_products": "Spices, Grains, Lentils"},

    # --- SATELLITE & SHYAMAL (10 stores) ---
    {"name": "Induben Khakhrawala", "type": "snacks", "lat": 23.0270, "long": 72.5180, "address": "Abhishree Cmplx, Opp Star Bazar", "area": "Satellite", "key_products": "Methi Khakhra, Bhakhri, Sweets"},
    {"name": "Silvi's Fashion House", "type": "clothing", "lat": 23.0205, "long": 72.5250, "address": "9, Parvatinagar, 100 Ft Rd", "area": "Satellite", "key_products": "Chaniya Choli, Kurtis"},
    {"name": "Special Groceries", "type": "kirana", "lat": 23.0145, "long": 72.5350, "address": "10, Shangrilla Arcade, Shyamal", "area": "Shyamal", "key_products": "Imported Sauces, Pastas"},
    {"name": "Ambica Pan Parlour", "type": "snacks", "lat": 23.0150, "long": 72.5345, "address": "5, Bileshwar Mahadev Rd, Shyamal", "area": "Shyamal", "key_products": "Masala Pan, Chocolates"},
    {"name": "Gift Articlewala", "type": "household", "lat": 23.0140, "long": 72.5360, "address": "544, Rajmani Society, Shyamal", "area": "Shyamal", "key_products": "Gift Wraps, Toys, Decor"},
    {"name": "Fashion Factory", "type": "clothing", "lat": 23.0160, "long": 72.5330, "address": "Citi Gold Mall, Shyamal", "area": "Shyamal", "key_products": "Branded Jeans, T-Shirts"},
    {"name": "D Mart Satellite", "type": "kirana", "lat": 23.0245, "long": 72.5290, "address": "Shivalik Park, Shivranjani", "area": "Satellite", "key_products": "Bulk Groceries, Home Essentials"},
    {"name": "H&M Satellite", "type": "clothing", "lat": 23.0280, "long": 72.5070, "address": "Iscon Emporio, Satellite", "area": "Satellite", "key_products": "International Fashion"},
    {"name": "Stylish Outfitter", "type": "clothing", "lat": 23.0300, "long": 72.5200, "address": "Mansi Circle, Vastrapur", "area": "Satellite", "key_products": "Men & Women Fashion"},
    {"name": "The Wrapping Store", "type": "household", "lat": 23.0142, "long": 72.5355, "address": "Pearl Apt, Shyamal", "area": "Shyamal", "key_products": "Gift Wrapping, Stationery"},

    # --- ELLISBRIDGE (6 stores) ---
    {"name": "Tankarawala Provision", "type": "kirana", "lat": 23.0210, "long": 72.5710, "address": "Old Dalia Bldg, Near VS Hospital", "area": "Ellisbridge", "key_products": "Dry Fruits, Ghee, Spices"},
    {"name": "Mint Health", "type": "medical", "lat": 23.0230, "long": 72.5690, "address": "Agrawal Chambers, Madalpur", "area": "Ellisbridge", "key_products": "Surgical Equipment, Medicines"},
    {"name": "Law Garden Market", "type": "clothing", "lat": 23.0263, "long": 72.5568, "address": "Netaji Road, Ellisbridge", "area": "Ellisbridge", "key_products": "Traditional Kutch Work, Sarees"},
    {"name": "V-Mart", "type": "clothing", "lat": 23.0255, "long": 72.5570, "address": "Law Garden Corner", "area": "Ellisbridge", "key_products": "Family Clothing, Kids Wear"},
    {"name": "Naresh Medical", "type": "medical", "lat": 23.0205, "long": 72.5715, "address": "Mahakant Complex, Paldi Rd", "area": "Ellisbridge", "key_products": "Prescription Medicines"},
    {"name": "Amardeep Consumer", "type": "kirana", "lat": 23.0240, "long": 72.5550, "address": "Panchavati Society, Gulbai Tekra", "area": "Ellisbridge", "key_products": "Groceries, Beverages"},
]

# Shop type to category mapping
TYPE_CATEGORY_MAP = {
    "kirana": ["Grocery", "Beverages", "Dairy", "Snacks", "Household"],
    "medical": ["Health", "Personal Care", "Baby Care"],
    "snacks": ["Snacks", "Bakery", "Sweets", "Beverages"],
    "clothing": ["Clothing", "Fashion", "Accessories"],
    "household": ["Household", "Kitchen", "Home Decor"],
    "pet": ["Pet Food", "Pet Care"],
    "electronics": ["Electronics", "Accessories"],
    "other": ["Miscellaneous"],
}


class Command(BaseCommand):
    help = "Seed 36 real Ahmedabad shops with verified coordinates and product assignments"

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--products-per-shop", type=int, default=20)

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        products_per_shop = options["products_per_shop"]

        products = list(Product.objects.select_related("category").all())
        if not products:
            raise CommandError("No products found. Run seed_products first.")

        categories = list(Category.objects.all())
        category_name_map = {c.name.lower(): c for c in categories}

        created_count = 0

        for index, store in enumerate(REAL_STORES):
            phone = f"90000{index + 10:05d}"
            owner_username = f"user_{phone}"

            user, created = User.objects.get_or_create(
                username=owner_username,
                defaults={"email": f"shop_{index + 1}@digibazaar.in"},
            )
            if created:
                user.set_password("OTPVerified123!")
                user.save(update_fields=["password"])

            owner_profile, _ = ShopOwner.objects.get_or_create(
                user=user, defaults={"phone": phone}
            )

            # Determine tier
            tier = "premium" if index % 4 == 0 else "free"

            # Opening hours
            from datetime import time
            opening = time(8, 0) if store["type"] != "medical" else time(9, 0)
            closing = time(22, 0) if store["type"] != "medical" else time(21, 0)

            shop, _ = Shop.objects.update_or_create(
                name=store["name"],
                defaults={
                    "owner": owner_profile,
                    "description": f"{store['name']} — {store.get('key_products', 'Quality products')}",
                    "shop_type": store["type"],
                    "tier": tier,
                    "rating": Decimal(str(round(rng.uniform(3.5, 4.9), 2))),
                    "review_count": rng.randint(10, 250),
                    "lat": Decimal(str(store["lat"])),
                    "long": Decimal(str(store["long"])),
                    "address": store["address"],
                    "area": store.get("area", "Ahmedabad"),
                    "city": "Ahmedabad",
                    "state": "Gujarat",
                    "pincode": "380007" if store.get("area") in ("Paldi", "Vasna") else "380015",
                    "delivery_radius_km": Decimal("5.00"),
                    "opening_time": opening,
                    "closing_time": closing,
                    "is_open": True,
                    "pickup_enabled": True,
                    "self_delivery_enabled": store["type"] in ("kirana", "medical"),
                    "digibazaar_delivery_enabled": True,
                    "min_order_amount": Decimal("100.00") if tier == "free" else Decimal("0"),
                    "delivery_charge_flat": Decimal("25.00"),
                    "free_delivery_above": Decimal("500.00"),
                    "live_inventory": rng.choice([True, False]),
                    "reliability_score": Decimal(str(round(rng.uniform(0.8, 1.0), 2))),
                    "cancellation_rate": Decimal(str(round(rng.uniform(0.0, 0.1), 2))),
                    "avg_preparation_time_mins": rng.randint(5, 20),
                    "is_verified": rng.choice([True, True, True, False]),  # 75% verified
                },
            )

            # Assign categories
            shop_categories = []
            type_cats = TYPE_CATEGORY_MAP.get(store["type"], ["Miscellaneous"])
            for cat_name in type_cats:
                cat = category_name_map.get(cat_name.lower())
                if cat:
                    shop_categories.append(cat)
            if shop_categories:
                shop.categories.set(shop_categories)

            # Assign products intelligently
            selected_products = self._pick_products(
                rng, products, shop_categories, products_per_shop,
            )
            # Use set() on through table — clears old, adds new
            shop.products.set(selected_products)

            created_count += 1
            self.stdout.write(
                f"  ✓ {store['name']} ({store['area']}) — "
                f"{len(selected_products)} products"
            )

        # ── Seed test customer + rider + order ──────────────
        self._seed_test_data(rng)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Seeded {created_count} real Ahmedabad shops "
                f"across 4 areas with product assignments."
            )
        )

    def _pick_products(self, rng, all_products, shop_categories, target):
        """Pick products matching shop categories, then fill remainder."""
        cat_ids = {c.id for c in shop_categories}
        matching = [p for p in all_products if p.category_id in cat_ids]
        rng.shuffle(matching)

        selected = matching[:target]
        if len(selected) < target:
            remainder = [p for p in all_products if p not in selected]
            rng.shuffle(remainder)
            selected += remainder[: target - len(selected)]

        return selected

    def _seed_test_data(self, rng):
        """Create test customer, rider, and a sample order."""
        # Customer
        cust_user, _ = User.objects.get_or_create(
            username="user_9999999999",
            defaults={"email": "customer@digibazaar.in"},
        )
        cust_user.set_password("OTPVerified123!")
        cust_user.save()
        UserProfile.objects.get_or_create(
            user=cust_user, defaults={"phone": "9999999999"}
        )

        # Rider
        rider_user, _ = User.objects.get_or_create(
            username="user_9876543210",
            defaults={"email": "rider@digibazaar.in"},
        )
        rider_user.set_password("OTPVerified123!")
        rider_user.save()
        rider_profile, _ = Rider.objects.get_or_create(
            user=rider_user,
            defaults={
                "phone": "9876543210",
                "is_online": True,
                "vehicle_type": "Motorcycle",
                "vehicle_number": "GJ-01-HA-9876",
                "lat": Decimal("23.0175"),
                "long": Decimal("72.5625"),
            },
        )
        rider_profile.is_online = True
        rider_profile.save()

        # Test order
        shop = Shop.objects.first()
        if shop:
            order, created = Order.objects.get_or_create(
                user=cust_user,
                shop=shop,
                status="pending",
                defaults={
                    "fulfillment_option": "digibazaar_delivery",
                    "delivery_address": "102, Patel Residency, Paldi, Ahmedabad - 380007",
                    "lat": Decimal("23.0125"),
                    "long": Decimal("72.5575"),
                    "delivery_charge": Decimal("35.00"),
                    "rider": rider_profile,
                    "payment_method": "cod",
                },
            )
            if created:
                prod = shop.products.first()
                if prod:
                    OrderItem.objects.create(
                        order=order,
                        product=prod,
                        quantity=2,
                        price_at_order=prod.price,
                    )
                DeliveryAssignment.objects.get_or_create(
                    order=order,
                    rider=rider_profile,
                    defaults={"status": "assigned", "eta": 15},
                )

        self.stdout.write("  ✓ Test customer, rider, and sample order created")
