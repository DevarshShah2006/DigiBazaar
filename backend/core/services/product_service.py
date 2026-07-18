"""
ProductService — product catalog business logic.
"""

from django.db.models import Q

from core.models import Product, Category


class ProductService:
    """Product search, filtering, and catalog management."""

    @staticmethod
    def search(query=None, category=None, brand=None, status="active",
               min_price=None, max_price=None, food_type=None, limit=50):
        qs = Product.objects.select_related("category", "subcategory")

        if status:
            qs = qs.filter(status=status)

        if query:
            qs = qs.filter(
                Q(name__icontains=query)
                | Q(brand__icontains=query)
                | Q(search_keywords__icontains=query)
                | Q(description__icontains=query)
            )

        if category:
            qs = qs.filter(
                Q(category__name__iexact=category)
                | Q(category__slug__iexact=category)
            )

        if brand:
            qs = qs.filter(brand__iexact=brand)

        if min_price is not None:
            qs = qs.filter(selling_price__gte=min_price)
        if max_price is not None:
            qs = qs.filter(selling_price__lte=max_price)

        if food_type:
            qs = qs.filter(food_type=food_type)

        return qs.distinct().order_by("name")[:limit]

    @staticmethod
    def get_by_shop(shop):
        return shop.products.select_related("category").filter(
            status="active", visibility=True,
        )

    @staticmethod
    def get_categories_with_counts():
        return (
            Category.objects.filter(is_active=True)
            .prefetch_related("products")
            .order_by("display_order", "name")
        )
