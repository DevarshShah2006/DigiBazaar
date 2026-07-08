import json
import random
from datetime import datetime, timedelta
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from core.models import Order, OrderItem, Product, Shop

User = get_user_model()

CO_PURCHASE_PATTERNS = [
    ["milk", "bread", "butter"],
    ["rice", "dal", "oil"],
    ["shampoo", "conditioner"],
    ["soap", "lotion", "face wash"],
    ["tomato", "onion", "potato"],
]


class Command(BaseCommand):
    help = "Generate synthetic orders, outputting JSON for handoff, or seed the DB from an input JSON."

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=300)
        parser.add_argument("--seed", type=int, default=99)
        parser.add_argument(
            "--output",
            type=str,
            default=None,
            help="Path to write the generated synthetic orders JSON.",
        )
        parser.add_argument(
            "--input",
            type=str,
            default=None,
            help="Path to read synthetic orders JSON to seed the database.",
        )

    def handle(self, *args, **options):
        input_path = options.get("input")
        output_path = options.get("output")

        if input_path:
            resolved_input = Path(input_path)
            if not resolved_input.is_absolute():
                resolved_input = Path(settings.BASE_DIR).parent / resolved_input
            self.seed_from_file(resolved_input)
        else:
            resolved_output = None
            if output_path:
                resolved_output = Path(output_path)
                if not resolved_output.is_absolute():
                    resolved_output = Path(settings.BASE_DIR).parent / resolved_output
            self.generate_and_seed(options["count"], options["seed"], resolved_output)

    def seed_from_file(self, path):
        path = Path(path)
        if not path.exists():
            raise CommandError(f"Input file not found: {path}")

        self.stdout.write(f"Reading orders from {path}...")
        with open(path, "r", encoding="utf-8") as f:

            orders_data = json.load(f)

        users_cache = {u.username: u for u in User.objects.all()}
        shops_cache = {s.name: s for s in Shop.objects.all()}
        products_cache = {p.name: p for p in Product.objects.all()}

        created_count = 0
        with transaction.atomic():
            # Clear existing orders to avoid duplicate seeding errors
            Order.objects.all().delete()

            for order_entry in orders_data:
                username = order_entry["username"]
                shop_name = order_entry["shop_name"]
                status = order_entry["status"]
                created_at_str = order_entry["created_at"]
                created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))


                user = users_cache.get(username)
                shop = shops_cache.get(shop_name)

                if not user or not shop:
                    continue

                order = Order.objects.create(
                    user=user,
                    shop=shop,
                    status=status,
                    created_at=created_at,
                    updated_at=created_at
                )

                order_items = []
                for item_entry in order_entry["items"]:
                    product_name = item_entry["product_name"]
                    quantity = item_entry["quantity"]
                    price = item_entry["price"]

                    product = products_cache.get(product_name)
                    if not product:
                        # Fallback or create mock
                        product = Product.objects.first()

                    order_items.append(
                        OrderItem(
                            order=order,
                            product=product,
                            quantity=quantity,
                            price_at_order=price
                        )
                    )
                OrderItem.objects.bulk_create(order_items)
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} orders from {path}"))

    def generate_and_seed(self, count, seed_val, output_path):
        rng = random.Random(seed_val)

        users = list(User.objects.all())
        shops = list(Shop.objects.prefetch_related("products").all())
        all_products = list(Product.objects.all())

        if not users:
            raise CommandError("No users found. Run seed_users first.")
        if not shops:
            raise CommandError("No shops found. Run seed_shops first.")
        if not all_products:
            raise CommandError("No products found. Run seed_products first.")

        # Build pattern buckets
        pattern_buckets = []
        for pattern in CO_PURCHASE_PATTERNS:
            bucket = []
            for p in all_products:
                if any(kw in p.name.lower() for kw in pattern):
                    bucket.append(p)
            if len(bucket) >= 2:
                pattern_buckets.append(bucket)

        statuses = ["pending", "accepted", "preparing", "ready", "completed", "rejected"]
        status_weights = [5, 15, 10, 10, 55, 5]

        orders_data = []

        for _ in range(count):
            user = rng.choice(users)
            shop = rng.choice(shops)
            shop_products = list(shop.products.all())
            if not shop_products:
                shop_products = rng.sample(all_products, min(5, len(all_products)))

            if pattern_buckets and rng.random() < 0.3:
                bucket = rng.choice(pattern_buckets)
                available = [p for p in bucket if p in shop_products or True]
                items_to_add = rng.sample(available, min(rng.randint(2, 3), len(available)))
            else:
                qty = rng.randint(1, min(4, len(shop_products)))
                items_to_add = rng.sample(shop_products, qty)

            status = rng.choices(statuses, weights=status_weights, k=1)[0]
            days_ago = rng.randint(0, 30)
            created_at = timezone.now() - timedelta(days=days_ago, hours=rng.randint(0, 23))

            items_list = []
            for product in items_to_add:
                items_list.append({
                    "product_name": product.name,
                    "quantity": rng.randint(1, 3),
                    "price": float(product.price)
                })

            orders_data.append({
                "username": user.username,
                "shop_name": shop.name,
                "status": status,
                "created_at": created_at.isoformat(),
                "items": items_list
            })

        # Save to file
        if not output_path:
            # Save to default folder in dataset
            output_dir = Path(settings.BASE_DIR).parent / "dataset"
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / "synthetic_orders.json"
        else:
            output_path = Path(output_path)


        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(orders_data, f, indent=2)

        self.stdout.write(self.style.SUCCESS(f"Saved {len(orders_data)} synthetic orders to {output_path}"))

        # Also seed directly to keep database up to date
        self.stdout.write("Seeding database directly with generated orders...")
        self.seed_from_file(output_path)
