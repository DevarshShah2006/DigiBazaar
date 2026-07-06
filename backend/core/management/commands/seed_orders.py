from django.core.management.base import BaseCommand
from core.models import Order, Product


class Command(BaseCommand):
    help = 'Seed sample orders'

    def handle(self, *args, **options):
        products = Product.objects.all()
        if not products.exists():
            self.stdout.write(self.style.WARNING('No products found. Seed products first.'))
            return

        for product in products[:5]:
            Order.objects.update_or_create(product=product, defaults={'quantity': 1})

        self.stdout.write(self.style.SUCCESS('Seeded orders'))
