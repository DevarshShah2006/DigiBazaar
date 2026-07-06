from django.core.management.base import BaseCommand
from core.models import Product, Shop


class Command(BaseCommand):
    help = 'Seed sample products'

    def handle(self, *args, **options):
        shop, _ = Shop.objects.get_or_create(name='Default Shop')
        products = [
            {'name': 'Product A', 'price': 19.99, 'inventory': 50},
            {'name': 'Product B', 'price': 29.99, 'inventory': 20},
            {'name': 'Product C', 'price': 9.99, 'inventory': 100},
        ]
        for item in products:
            Product.objects.update_or_create(shop=shop, name=item['name'], defaults=item)
        self.stdout.write(self.style.SUCCESS('Seeded products'))
