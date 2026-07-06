from decimal import Decimal
import random

import requests
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from core.models import Category, Product, Shop, ShopOwner


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

            owner_username = f"paldi_owner_{index + 1}"
            user, created = User.objects.get_or_create(
                username=owner_username,
                defaults={'email': f'{owner_username}@example.com'},
            )
            if created:
                user.set_password('PaldiShop123!')
                user.save(update_fields=['password'])

            owner_profile, _ = ShopOwner.objects.get_or_create(user=user, defaults={'phone': ''})

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

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {created_count} Paldi shops with geocoded coordinates and product mixes.'
            )
        )
