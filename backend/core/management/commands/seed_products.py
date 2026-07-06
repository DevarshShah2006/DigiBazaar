from pathlib import Path

import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

from core.models import Category, Product


class Command(BaseCommand):
    help = 'Seed products from the cleaned BigBasket + Flipkart CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            '--input',
            default=None,
            help='Path to the cleaned CSV. Defaults to dataset/cleaned_products.csv in the repo root.',
        )

    def resolve_input_path(self, provided_path: str | None) -> Path:
        if provided_path:
            return Path(provided_path)
        return Path(settings.BASE_DIR).parent / 'dataset' / 'cleaned_products.csv'

    def handle(self, *args, **options):
        input_path = self.resolve_input_path(options.get('input'))
        if not input_path.exists():
            raise CommandError(f'Cleaned CSV not found: {input_path}')

        frame = pd.read_csv(input_path)
        required_columns = {'name', 'category', 'brand', 'price', 'image_url'}
        missing_columns = required_columns.difference(frame.columns)
        if missing_columns:
            raise CommandError(f'Cleaned CSV is missing columns: {", ".join(sorted(missing_columns))}')

        Product.objects.all().delete()

        categories = {}
        products = []

        with transaction.atomic():
            for _, row in frame.iterrows():
                category_name = str(row['category']).strip() or 'Miscellaneous'
                category_slug = slugify(category_name)
                category, _ = Category.objects.get_or_create(
                    slug=category_slug,
                    defaults={'name': category_name},
                )
                if category.name != category_name:
                    category.name = category_name
                    category.save(update_fields=['name'])

                categories[category_slug] = category

                products.append(
                    Product(
                        name=str(row['name']).strip(),
                        category=category,
                        brand=str(row['brand']).strip(),
                        price=row['price'],
                        image_url=str(row['image_url']).strip(),
                    )
                )

            Product.objects.bulk_create(products, batch_size=1000)

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded {len(products)} products across {len(categories)} categories from {input_path}'
            )
        )
