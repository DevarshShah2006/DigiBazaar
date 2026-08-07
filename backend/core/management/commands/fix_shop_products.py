"""
fix_shop_products — Fix shop-product assignments so each shop only shows
products relevant to its shop_type. Removes cross-contamination of pet
food, clothing, etc. in grocery/snack/medical shops.

Usage:
    python manage.py fix_shop_products
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from core.models import Shop, Product, ShopProduct, Inventory


# Which product categories are ALLOWED per shop type
SHOP_TYPE_ALLOWED_CATEGORIES = {
    'kirana': [
        'Dairy & Bakery', 'Fresh Produce', 'Grocery', 'Spices & Dry Fruits',
        'Beverages', 'Snacks & Biscuits', 'Sweets & Chocolates', 'Homegrown',
        'Instant Food', 'Frozen Foods', 'Oils & Ghee', 'Tea & Coffee',
        'Organic & Natural',
    ],
    'snacks': [
        'Snacks & Biscuits', 'Sweets & Chocolates', 'Beverages', 'Tea & Coffee',
        'Instant Food', 'Homegrown',
    ],
    'medical': [
        'Health & Pharma', 'Baby Care', 'Bath & Body', 'Grooming',
        'Beauty & Makeup',
    ],
    'clothing': [
        'Clothing', 'Fashion', 'Accessories',
    ],
    'household': [
        'Home & Living', 'Cleaning', 'Electronics',
        'Bath & Body', 'Grooming', 'Kitchen',
    ],
    'pet': [
        'Pet Care',
    ],
}

# Fallback by keyword matching on category name/slug for categories
# that may have slightly different names in DB
SHOP_TYPE_CATEGORY_KEYWORDS = {
    'kirana': ['dairy', 'bakery', 'fresh', 'grocery', 'spice', 'dry fruit',
               'beverage', 'snack', 'biscuit', 'sweet', 'chocolat', 'homegrown',
               'instant', 'frozen', 'oil', 'ghee', 'tea', 'coffee', 'organic'],
    'snacks': ['snack', 'biscuit', 'sweet', 'chocolat', 'beverage', 'tea',
               'coffee', 'instant', 'namkeen', 'homegrown'],
    'medical': ['health', 'pharma', 'baby', 'bath', 'body', 'grooming',
                'beauty', 'makeup', 'personal care'],
    'clothing': ['cloth', 'fashion', 'wear', 'apparel', 'accessor'],
    'household': ['home', 'living', 'clean', 'electronic', 'kitchen', 'bath',
                  'body', 'groom'],
    'pet': ['pet', 'animal', 'dog', 'cat'],
}


def category_allowed_for_shop(category, shop_type):
    """Return True if this category is allowed for the given shop type."""
    keywords = SHOP_TYPE_CATEGORY_KEYWORDS.get(shop_type, [])
    cat_name = (category.name or '').lower()
    cat_slug = (category.slug or '').lower()
    for kw in keywords:
        if kw in cat_name or kw in cat_slug:
            return True
    return False


class Command(BaseCommand):
    help = "Fix shop-product assignments: remove products that don't belong to the shop's category"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            "\n=== Fixing Shop-Product Assignments ===\n"
        ))

        shops = list(Shop.objects.prefetch_related('products__category').all())
        total_removed = 0
        total_kept = 0

        for shop in shops:
            shop_type = shop.shop_type or 'kirana'
            products = list(shop.products.select_related('category').all())

            to_remove_ids = []
            to_keep_ids = []

            for product in products:
                if product.category is None:
                    # No category — remove from this shop
                    to_remove_ids.append(product.id)
                    continue

                allowed = category_allowed_for_shop(product.category, shop_type)
                if allowed:
                    to_keep_ids.append(product.id)
                else:
                    to_remove_ids.append(product.id)

            if to_remove_ids:
                # Remove wrong-category ShopProduct entries
                removed = ShopProduct.objects.filter(
                    shop=shop,
                    product_id__in=to_remove_ids
                ).delete()
                removed_count = removed[0]
                total_removed += removed_count
                self.stdout.write(
                    f"  [{shop.shop_type}] {shop.name}: removed {removed_count} wrong products, kept {len(to_keep_ids)}"
                )
            else:
                self.stdout.write(
                    f"  [{shop.shop_type}] {shop.name}: OK — {len(to_keep_ids)} products all valid"
                )
                total_kept += len(to_keep_ids)

        # Also deactivate all pet food and clothing products from visibility
        # (so they never appear in recommendations/listings for wrong shops)
        pet_q = (
            Q(category__name__icontains='pet') |
            Q(category__slug__icontains='pet') |
            Q(name__icontains='cat food') |
            Q(name__icontains='dog food') |
            Q(name__icontains='whiskas') |
            Q(name__icontains='pedigree') |
            Q(name__icontains='drools')
        )
        pet_deactivated = Product.objects.filter(pet_q).update(visibility=False, status='inactive')

        clothing_q = (
            Q(category__name__icontains='cloth') |
            Q(category__slug__icontains='cloth') |
            Q(category__name__icontains='fashion') |
            Q(category__slug__icontains='fashion')
        )
        # Clothing stays visible only in clothing shops — but deactivate globally
        # if you want them hidden everywhere. Keeping them active for clothing shops.
        # Just make sure non-clothing shops don't have them (handled above).

        self.stdout.write(self.style.SUCCESS(
            "\n[DONE] Fix Complete!"
            f"\n   Total ShopProduct entries removed: {total_removed}"
            f"\n   Pet/cat food products deactivated from global listings: {pet_deactivated}"
        ))
