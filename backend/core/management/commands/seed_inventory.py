"""
seed_inventory — Generate realistic inventory records for all shop-product pairs.
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Shop, Product, Inventory, InventoryLog


SUPPLIERS = [
    "Ahmedabad FMCG Distributors",
    "Gujarat Wholesale Market",
    "Paldi Trading Co.",
    "Vasna Supply Chain",
    "Metro Cash & Carry",
    "Reliance Fresh Distribution",
    "Local Farmer Direct",
    "Dmart Wholesale",
]

FOOD_CATEGORIES = {"dairy", "snacks", "bakery", "beverages", "grocery", "fruits", "vegetables"}


class Command(BaseCommand):
    help = "Generate inventory records for every shop-product pair"

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])
        now = timezone.now()

        shops = Shop.objects.prefetch_related("products").all()
        if not shops.exists():
            self.stderr.write("No shops found. Run seed_shops first.")
            return

        # Clear existing inventory
        Inventory.objects.all().delete()

        created = 0
        for shop in shops:
            products = list(shop.products.all())
            for product in products:
                # Realistic stock levels
                is_popular = rng.random() < 0.3
                is_slow_mover = rng.random() < 0.15

                if is_popular:
                    current_stock = rng.randint(50, 200)
                elif is_slow_mover:
                    current_stock = rng.randint(0, 5)  # Triggers low stock alerts
                else:
                    current_stock = rng.randint(10, 80)

                # Some items out of stock
                if rng.random() < 0.08:
                    current_stock = 0

                # Reserved stock
                reserved = rng.randint(0, min(5, current_stock))

                # Expiry for food items
                cat_name = (product.category.name.lower() if product.category else "")
                expiry_date = None
                if cat_name in FOOD_CATEGORIES or product.shelf_life:
                    if rng.random() < 0.7:
                        days_until_expiry = rng.randint(1, 90)
                        expiry_date = (now + timedelta(days=days_until_expiry)).date()
                        # Some items expiring very soon (for alerts)
                        if rng.random() < 0.15:
                            expiry_date = (now + timedelta(days=rng.randint(1, 3))).date()

                # Purchase price slightly below selling
                sell_price = float(product.selling_price or product.price or 100)
                purchase_price = round(sell_price * rng.uniform(0.55, 0.75), 2)

                inv = Inventory.objects.create(
                    shop=shop,
                    product=product,
                    current_stock=current_stock,
                    reserved_stock=reserved,
                    incoming_stock=rng.randint(0, 20) if rng.random() < 0.3 else 0,
                    reorder_level=rng.choice([5, 10, 15, 20]),
                    min_stock=5,
                    max_stock=rng.choice([200, 300, 500]),
                    batch_number=f"BATCH-{shop.id:03d}-{product.id:04d}",
                    supplier_name=rng.choice(SUPPLIERS),
                    purchase_price=Decimal(str(purchase_price)),
                    selling_price=Decimal(str(sell_price)),
                    expiry_date=expiry_date,
                    warehouse_location=f"Rack-{rng.choice('ABCDEF')}{rng.randint(1,20)}",
                    last_restocked=now - timedelta(days=rng.randint(1, 14)),
                )

                # Create initial log entry
                InventoryLog.objects.create(
                    inventory=inv,
                    change_type="restock",
                    quantity_change=current_stock,
                    stock_after=current_stock,
                    reference="Initial seed",
                )

                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ Created {created} inventory records across {shops.count()} shops"
            )
        )
