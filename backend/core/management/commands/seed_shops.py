from django.core.management.base import BaseCommand
from core.models import Shop


class Command(BaseCommand):
    help = 'Seed sample shops'

    def handle(self, *args, **options):
        shops = [
            {'name': 'Default Shop', 'description': 'A default seller for sample data.'},
            {'name': 'Premium Shop', 'description': 'A premium store for curated products.'},
        ]
        for item in shops:
            Shop.objects.update_or_create(name=item['name'], defaults=item)
        self.stdout.write(self.style.SUCCESS('Seeded shops'))
