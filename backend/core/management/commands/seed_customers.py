"""
seed_customers — Generate realistic customer profiles.
"""

import random
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from core.models import UserProfile, Customer, CustomerAddress

User = get_user_model()

AHMEDABAD_ADDRESSES = [
    ("102, Patel Residency, Paldi", "Paldi", "380007", 23.0105, 72.5612),
    ("NID Campus Hostel Block B, Paldi", "Paldi", "380007", 23.0130, 72.5640),
    ("A-12, Shaligram Flats, Vasna", "Vasna", "380007", 23.0039, 72.5460),
    ("305, Rajmani Society, Shyamal", "Shyamal", "380015", 23.0145, 72.5350),
    ("B-7, Satellite Towers, Satellite", "Satellite", "380015", 23.0270, 72.5180),
    ("15, Law Garden Apts, Ellisbridge", "Ellisbridge", "380006", 23.0263, 72.5568),
    ("42, Ambawadi Society, Ambawadi", "Ambawadi", "380006", 23.0210, 72.5510),
    ("23, Gulbai Tekra Cross Rd", "Gulbai Tekra", "380006", 23.0240, 72.5550),
    ("67, Shivranjani Society", "Shivranjani", "380015", 23.0245, 72.5290),
    ("9, Prahlad Nagar Complex", "Prahlad Nagar", "380015", 23.0120, 72.5100),
    ("401, Takshshila Apts, Paldi", "Paldi", "380007", 23.0092, 72.5585),
    ("B-201, Nirakar Society, Shreyas", "Paldi", "380007", 23.0079, 72.5537),
    ("14, Dev Status, Vikas Gruh Rd", "Paldi", "380007", 23.0100, 72.5605),
    ("C-3, Bhagirath Society, Vasna", "Vasna", "380007", 23.0025, 72.5470),
    ("55, Parvatinagar, 100 Ft Rd", "Satellite", "380015", 23.0205, 72.5250),
]

FIRST_NAMES = [
    "Aarav", "Priya", "Rohan", "Ananya", "Vivek", "Neha", "Karan", "Meera",
    "Arjun", "Divya", "Harsh", "Pooja", "Raj", "Shreya", "Dev", "Riya",
    "Amit", "Kavya", "Nikhil", "Tanvi", "Sahil", "Ishita", "Yash", "Nisha",
    "Dhruv", "Aisha", "Mihir", "Jhanvi", "Varun", "Tanya", "Kunal", "Swati",
    "Parth", "Kriti", "Jay", "Diya", "Manav", "Bhavna", "Gaurav", "Aditi",
    "Chirag", "Sneha", "Pranav", "Megha", "Vikram", "Sonam", "Aditya", "Pallavi",
    "Siddharth", "Mira",
]

SEGMENTS = ["Champion", "Loyal", "Promising", "New", "At Risk", "Lost", "Hibernating"]


class Command(BaseCommand):
    help = "Generate 50 realistic customer profiles with Ahmedabad addresses"

    def add_arguments(self, parser):
        parser.add_argument("--count", type=int, default=50)
        parser.add_argument("--seed", type=int, default=42)

    def handle(self, *args, **options):
        count = options["count"]
        rng = random.Random(options["seed"])

        created = 0
        for i in range(count):
            name = rng.choice(FIRST_NAMES)
            phone = f"98{rng.randint(10000000, 99999999)}"
            username = f"user_{phone}"

            user, user_created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{name.lower()}{i}@gmail.com",
                    "first_name": name,
                },
            )
            if user_created:
                user.set_password("OTPVerified123!")
                user.save()

            UserProfile.objects.get_or_create(
                user=user, defaults={"phone": phone, "full_name": name}
            )

            # Customer commerce profile
            purchase_count = rng.randint(0, 80)
            avg_order = round(rng.uniform(150, 800), 2)
            total_spent = round(purchase_count * avg_order, 2)

            customer, _ = Customer.objects.update_or_create(
                user=user,
                defaults={
                    "purchase_count": purchase_count,
                    "total_spent": Decimal(str(total_spent)),
                    "average_order_value": Decimal(str(avg_order)),
                    "lifetime_value": Decimal(str(round(total_spent * 1.2, 2))),
                    "repeat_rate": Decimal(str(round(rng.uniform(0, 85), 2))),
                    "favorite_categories": rng.sample(
                        ["grocery", "dairy", "snacks", "beverages", "personal-care",
                         "household", "fashion", "bakery"],
                        k=rng.randint(1, 3),
                    ),
                    "wallet_balance": Decimal(str(round(rng.uniform(0, 500), 2))),
                    "loyalty_points": rng.randint(0, 2000),
                    "segment": rng.choice(SEGMENTS),
                },
            )

            # Addresses (1-3 per customer)
            addr_count = rng.randint(1, min(3, len(AHMEDABAD_ADDRESSES)))
            chosen_addrs = rng.sample(AHMEDABAD_ADDRESSES, addr_count)
            for j, (addr, area, pin, lat, lng) in enumerate(chosen_addrs):
                CustomerAddress.objects.get_or_create(
                    customer=customer,
                    full_address=addr,
                    defaults={
                        "label": "home" if j == 0 else rng.choice(["work", "other"]),
                        "city": "Ahmedabad",
                        "pincode": pin,
                        "lat": Decimal(str(lat)),
                        "long": Decimal(str(lng)),
                        "is_default": j == 0,
                    },
                )

            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"✅ Created {created} customer profiles with addresses")
        )
