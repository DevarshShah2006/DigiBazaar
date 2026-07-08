import pandas as pd
from datetime import timedelta
from django.utils import timezone

from core.models import OrderItem


def trending(hours=24, limit=10):
    """
    Return trending products and categories based on
    order quantities within the last `hours`.
    """

    cutoff = timezone.now() - timedelta(hours=hours)

    order_items = OrderItem.objects.filter(
        order__created_at__gte=cutoff
    ).values(
        "product_id",
        "product__name",
        "product__category__name",
        "quantity",
    )

    if not order_items:
        return {
            "products": [],
            "categories": [],
        }

    df = pd.DataFrame(order_items)

    product_trending = (
        df.groupby(
            ["product_id", "product__name"],
            as_index=False
        )["quantity"]
        .sum()
        .sort_values("quantity", ascending=False)
        .head(limit)
        .rename(columns={
            "product__name": "product_name"
        })
    )

    category_trending = (
        df.groupby(
            "product__category__name",
            as_index=False
        )["quantity"]
        .sum()
        .sort_values("quantity", ascending=False)
        .head(limit)
        .rename(columns={
            "product__category__name": "category"
        })
    )

    return {
        "products": product_trending.to_dict(orient="records"),
        "categories": category_trending.to_dict(orient="records"),
    }