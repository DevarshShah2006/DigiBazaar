from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from core.models import Category, Product


def trending_products(limit=10):
    window_start = timezone.now() - timedelta(days=7)
    trending = (
        Product.objects.filter(created_at__gte=window_start)
        .order_by('-created_at')
    )

    if trending.count() >= limit:
        return trending[:limit]

    return Product.objects.order_by('-created_at')[:limit
    ]


def last_24h(limit=10):
    cutoff = timezone.now() - timedelta(hours=24)
    return Product.objects.filter(created_at__gte=cutoff).order_by('-created_at')[:limit]


def last_7_days(limit=10):
    cutoff = timezone.now() - timedelta(days=7)
    return Product.objects.filter(created_at__gte=cutoff).order_by('-created_at')[:limit]


def top_categories(limit=10):
    return Category.objects.annotate(
        sales=Sum('products__order_items__quantity')
    ).order_by('-sales')[:limit]


def top_products(limit=10):
    return Product.objects.annotate(
        sales=Sum('order_items__quantity')
    ).order_by('-sales', '-rating')[:limit]
