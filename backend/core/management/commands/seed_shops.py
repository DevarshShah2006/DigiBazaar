from decimal import Decimal
import random

import requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import Category, Product, Shop, ShopOwner, UserProfile, Rider, Order, OrderItem, DeliveryAssignment


User = get_user_model()

PALDI_CENTER_LAT = 23.0125
PALDI_CENTER_LONG = 72.5575


def geocode_address(address: str, fallback_lat: float, fallback_long: float, session: requests.Session) -> tuple[Decimal, Decimal]:
    url = 'https://nominatim.openstreetmap.org/search'
    params = {'q': address, 'format': 'jsonv2', 'limit': 1}

    try:
        response = session.get(url, params=params, timeout=10)
        response.raise_for_status()
        payload = response.json()
        if payload:
            return Decimal(str(payload[0]['lat'])), Decimal(str(payload[0]['lon']))
    except requests.RequestException:
        pass

    return Decimal(f'{fallback_lat:.6f}'), Decimal(f'{fallback_long:.6f}')


class Command(BaseCommand):
    help = 'Seed Paldi shops with geocoded coordinates and category-based product mixes'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=10, help='Number of shops to create. Default: 10')
        parser.add_argument('--featured-count', type=int, default=8, help='Number of shops that should receive 20 products.')
        parser.add_argument('--products-per-featured-shop', type=int, default=20)
        parser.add_argument('--products-per-small-shop', type=int, default=12)
        parser.add_argument('--seed', type=int, default=42, help='Random seed for repeatable shop generation.')

    def build_shop_specs(self, count: int) -> list[dict]:
        base_specs = [
            {'name': 'Paldi Fresh Mart', 'street': 'Opp. Paldi Bus Stop'},
            {'name': 'Paldi Daily Needs', 'street': 'Near NID Main Gate'},
            {'name': 'Paldi Fashion Hub', 'street': 'Law Garden Extension Road'},
            {'name': 'Paldi Grocery Point', 'street': 'Sardar Bridge Circle'},
            {'name': 'Paldi Family Store', 'street': 'Ambawadi Side Lane'},
            {'name': 'Paldi Urban Basket', 'street': 'Mahalaxmi Cross Road'},
            {'name': 'Paldi Style Corner', 'street': 'Ellisbridge Connector'},
            {'name': 'Paldi Value Store', 'street': 'Aashram Road Junction'},
            {'name': 'Paldi Market Square', 'street': 'University Road Link'},
            {'name': 'Paldi Bazaar Hub', 'street': 'Prerna Tirth Road'},
        ]
        return base_specs[:count]

    def pick_products_for_shop(self, rng: random.Random, chosen_categories, target_count: int):
        category_products = list(Product.objects.filter(category__in=chosen_categories).distinct())
        if len(category_products) >= target_count:
            return rng.sample(category_products, target_count)

        selected_products = list(category_products)
        all_products = list(Product.objects.all())
        rng.shuffle(all_products)
        seen_ids = {product.id for product in selected_products}

        for product in all_products:
            if product.id in seen_ids:
                continue
            selected_products.append(product)
            seen_ids.add(product.id)
            if len(selected_products) >= target_count:
                break

        return selected_products

    def handle(self, *args, **options):
        total_shops = options['count']
        featured_count = options['featured_count']
        products_per_featured_shop = options['products_per_featured_shop']
        products_per_small_shop = options['products_per_small_shop']
        rng = random.Random(options['seed'])

        if total_shops < 1:
            raise CommandError('count must be at least 1')

        products = list(Product.objects.select_related('category').all())
        if not products:
            raise CommandError('No products found. Run seed_products first.')

        categories = list(Category.objects.all())
        if not categories:
            raise CommandError('No categories found. Run seed_products first.')

        shop_specs = self.build_shop_specs(total_shops)
        if len(shop_specs) < total_shops:
            for index in range(len(shop_specs), total_shops):
                shop_specs.append({'name': f'Paldi Shop {index + 1}', 'street': f'Paldi Locality Block {index + 1}'})

        session = requests.Session()
        session.headers.update({'User-Agent': 'DigiBazaar/1.0 (local-seeding)'})

        created_count = 0
        for index, spec in enumerate(shop_specs):
            shop_name = spec['name']
            street = spec['street']
            address = f"{street}, Paldi, Ahmedabad, Gujarat, India"
            fallback_lat = PALDI_CENTER_LAT + rng.uniform(-0.012, 0.012)
            fallback_long = PALDI_CENTER_LONG + rng.uniform(-0.012, 0.012)
            lat, long = geocode_address(address, fallback_lat, fallback_long, session)

            phone = f"900000000{index + 1}" if index < 9 else f"90000000{index + 1}"
            owner_username = f"user_{phone}"
            user, created = User.objects.get_or_create(
                username=owner_username,
                defaults={'email': f'paldi_owner_{index + 1}@example.com'},
            )
            if created:
                user.set_password('OTPVerified123!')
                user.save(update_fields=['password'])

            owner_profile, _ = ShopOwner.objects.get_or_create(user=user, defaults={'phone': phone})

            chosen_categories = rng.sample(categories, k=min(len(categories), rng.randint(2, 4)))
            target_count = products_per_featured_shop if index < featured_count else products_per_small_shop
            selected_products = self.pick_products_for_shop(rng, chosen_categories, target_count)

            shop, _ = Shop.objects.update_or_create(
                name=shop_name,
                defaults={
                    'owner': owner_profile,
                    'tier': 'premium' if index % 3 == 0 else 'free',
                    'rating': round(rng.uniform(3.6, 4.9), 2),
                    'lat': lat,
                    'long': long,
                    'address': address,
                },
            )
            shop.categories.set(chosen_categories)
            shop.products.set(selected_products)
            created_count += 1

        # Seed default linked testing order
        # 1. Create customer
        cust_user, _ = User.objects.get_or_create(
            username='user_9999999999',
            defaults={'email': 'customer@example.com'}
        )
        cust_user.set_password('OTPVerified123!')
        cust_user.save()
        UserProfile.objects.get_or_create(user=cust_user, defaults={'phone': '9999999999'})

        # 2. Create rider
        rider_user, _ = User.objects.get_or_create(
            username='user_9876543210',
            defaults={'email': 'rider@digibazaar.in'}
        )
        rider_user.set_password('OTPVerified123!')
        rider_user.save()
        rider_profile, _ = Rider.objects.get_or_create(
            user=rider_user,
            defaults={
                'phone': '9876543210',
                'is_online': True,
                'vehicle_type': 'Motorcycle',
                'vehicle_number': 'GJ-01-HA-9876',
                'lat': PALDI_CENTER_LAT + 0.005,
                'long': PALDI_CENTER_LONG + 0.005
            }
        )
        rider_profile.is_online = True
        rider_profile.save()

        # 3. Create order from customer to Shop 1 (Paldi Fresh Mart)
        shop_fresh_mart = Shop.objects.first()
        if shop_fresh_mart:
            order, created = Order.objects.get_or_create(
                user=cust_user,
                shop=shop_fresh_mart,
                status='pending',
                defaults={
                    'fulfillment_option': 'digibazaar_delivery',
                    'delivery_address': '102, Patel Residency, Paldi, Ahmedabad, Gujarat - 380007',
                    'lat': Decimal(str(PALDI_CENTER_LAT)),
                    'long': Decimal(str(PALDI_CENTER_LONG)),
                    'delivery_charge': Decimal('35.00'),
                    'rider': rider_profile
                }
            )
            if created:
                # Add order item
                prod = shop_fresh_mart.products.first()
                if prod:
                    OrderItem.objects.create(
                        order=order,
                        product=prod,
                        quantity=2,
                        price_at_order=prod.price
                    )
                # Create DeliveryAssignment
                DeliveryAssignment.objects.get_or_create(
                    order=order,
                    rider=rider_profile,
                    defaults={
                        'status': 'assigned',
                        'eta': 15
                    }
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {created_count} Paldi shops with geocoded coordinates, product mixes, and 1 linked test order.'
            )
        )
