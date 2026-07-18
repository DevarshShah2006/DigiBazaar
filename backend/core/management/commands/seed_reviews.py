"""
seed_reviews — Generate realistic reviews linked to completed orders.
"""

import random
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from core.models import Order, Review

User = get_user_model()

POSITIVE_TITLES = [
    "Great quality!", "Very fresh", "Fast delivery", "Good value for money",
    "Always reliable", "Love this shop", "Excellent products", "Highly recommend",
    "Best in Paldi", "Quick and easy", "Super fresh produce", "Very happy",
]
POSITIVE_COMMENTS = [
    "Delivered on time and products were fresh. Will order again.",
    "Great selection at reasonable prices. The shop owner is very helpful.",
    "Fast delivery and excellent quality. Packing was also very good.",
    "I've been ordering here weekly. Never disappointed. Highly recommended!",
    "Fresh vegetables and dairy products. Much better than supermarket.",
    "The khakhra from this shop is absolutely amazing. Authentic taste!",
    "Good medical store with genuine medicines. Quick service.",
    "Nice variety of products. The prices are competitive too.",
]
NEGATIVE_TITLES = [
    "Could be better", "Late delivery", "Average quality", "Not as expected",
]
NEGATIVE_COMMENTS = [
    "Delivery was delayed by 20 minutes. Products were okay.",
    "Some items were out of stock but they didn't inform before delivery.",
    "Quality was average, expected better for the price.",
    "Packaging could be improved. One item was slightly damaged.",
]


class Command(BaseCommand):
    help = "Generate reviews for completed orders"

    def add_arguments(self, parser):
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, **options):
        rng = random.Random(options["seed"])

        completed_orders = Order.objects.filter(
            status__in=["completed", "delivered"]
        ).select_related("user", "shop")[:200]

        if not completed_orders:
            self.stderr.write("No completed orders found. Run seed_orders first.")
            return

        Review.objects.all().delete()
        created = 0

        for order in completed_orders:
            # 60% chance of leaving a review
            if rng.random() > 0.6:
                continue

            rating = rng.choices([5, 4, 3, 2, 1], weights=[40, 30, 15, 10, 5])[0]

            if rating >= 4:
                title = rng.choice(POSITIVE_TITLES)
                comment = rng.choice(POSITIVE_COMMENTS)
            else:
                title = rng.choice(NEGATIVE_TITLES)
                comment = rng.choice(NEGATIVE_COMMENTS)

            product = order.items.first()
            Review.objects.create(
                user=order.user,
                shop=order.shop,
                product=product.product if product else None,
                order=order,
                rating=rating,
                title=title,
                comment=comment,
                is_verified_purchase=True,
                helpful_count=rng.randint(0, 25),
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"✅ Created {created} reviews for completed orders")
        )
