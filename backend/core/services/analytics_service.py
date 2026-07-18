"""
AnalyticsService — generates all analytics from database queries.

Never hardcoded. Every chart, every number, every table comes from SQL.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Avg, Count, F, Q, Sum, Value,
    DecimalField as DjDecimalField,
)
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth, Coalesce
from django.utils import timezone

from core.models import Order, OrderItem, Customer


class AnalyticsService:
    """Analytics queries for shop owners."""

    def __init__(self, shop_ids):
        self.shop_ids = shop_ids
        self.now = timezone.now()

    def _completed_items(self):
        return OrderItem.objects.filter(
            order__shop_id__in=self.shop_ids,
            order__status__in=["completed", "delivered"],
        )

    # ─── Revenue ────────────────────────────────────────────

    def revenue_by_period(self, period="daily", days=30):
        cutoff = self.now - timedelta(days=days)
        trunc_fn = {
            "daily": TruncDate,
            "weekly": TruncWeek,
            "monthly": TruncMonth,
        }.get(period, TruncDate)

        data = (
            self._completed_items()
            .filter(order__created_at__gte=cutoff)
            .annotate(period=trunc_fn("order__created_at"))
            .values("period")
            .annotate(revenue=Sum(F("price_at_order") * F("quantity")))
            .order_by("period")
        )
        return [
            {
                "period": item["period"].isoformat() if item["period"] else "",
                "revenue": float(item["revenue"] or 0),
            }
            for item in data
        ]

    def total_revenue(self, days=None):
        qs = self._completed_items()
        if days:
            qs = qs.filter(order__created_at__gte=self.now - timedelta(days=days))
        result = qs.aggregate(
            total=Coalesce(
                Sum(F("price_at_order") * F("quantity")),
                Value(Decimal("0")),
                output_field=DjDecimalField(),
            )
        )
        return float(result["total"])

    # ─── Orders ─────────────────────────────────────────────

    def orders_by_status(self):
        data = (
            Order.objects.filter(shop_id__in=self.shop_ids)
            .values("status")
            .annotate(count=Count("id"))
        )
        return {item["status"]: item["count"] for item in data}

    def orders_over_time(self, days=30):
        cutoff = self.now - timedelta(days=days)
        data = (
            Order.objects.filter(
                shop_id__in=self.shop_ids,
                created_at__gte=cutoff,
            )
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        return [
            {
                "date": item["date"].isoformat() if item["date"] else "",
                "count": item["count"],
            }
            for item in data
        ]

    # ─── Products ───────────────────────────────────────────

    def top_selling_products(self, limit=10):
        data = (
            self._completed_items()
            .values("product__name", "product__id")
            .annotate(
                sold_count=Sum("quantity"),
                revenue=Sum(F("price_at_order") * F("quantity")),
            )
            .order_by("-sold_count")[:limit]
        )
        return [
            {
                "product_id": item["product__id"],
                "product_name": item["product__name"],
                "sold_count": item["sold_count"],
                "revenue": float(item["revenue"] or 0),
            }
            for item in data
        ]

    def least_selling_products(self, limit=10):
        data = (
            self._completed_items()
            .values("product__name", "product__id")
            .annotate(sold_count=Sum("quantity"))
            .order_by("sold_count")[:limit]
        )
        return [
            {
                "product_id": item["product__id"],
                "product_name": item["product__name"],
                "sold_count": item["sold_count"],
            }
            for item in data
        ]

    # ─── Customers ──────────────────────────────────────────

    def customer_stats(self):
        orders = Order.objects.filter(shop_id__in=self.shop_ids)
        total_customers = orders.values("user_id").distinct().count()
        repeat_customers = (
            orders.values("user_id")
            .annotate(order_count=Count("id"))
            .filter(order_count__gt=1)
            .count()
        )
        return {
            "total_customers": total_customers,
            "repeat_customers": repeat_customers,
            "repeat_rate": (
                round(repeat_customers / total_customers * 100, 1)
                if total_customers > 0
                else 0
            ),
        }

    # ─── Delivery ───────────────────────────────────────────

    def delivery_stats(self):
        delivered = Order.objects.filter(
            shop_id__in=self.shop_ids,
            status__in=["completed", "delivered"],
            delivery_time_mins__isnull=False,
        )
        avg_delivery = delivered.aggregate(avg=Avg("delivery_time_mins"))["avg"]
        avg_prep = delivered.aggregate(avg=Avg("preparation_time_mins"))["avg"]

        total = Order.objects.filter(shop_id__in=self.shop_ids).count()
        cancelled = Order.objects.filter(
            shop_id__in=self.shop_ids, status="cancelled",
        ).count()

        return {
            "avg_delivery_time_mins": round(avg_delivery, 1) if avg_delivery else 0,
            "avg_preparation_time_mins": round(avg_prep, 1) if avg_prep else 0,
            "delivery_success_rate": (
                round((total - cancelled) / total * 100, 1) if total > 0 else 100
            ),
        }

    # ─── Full Report ────────────────────────────────────────

    def build_full_report(self, days=30):
        return {
            "total_revenue": self.total_revenue(days=days),
            "total_orders": Order.objects.filter(
                shop_id__in=self.shop_ids
            ).count(),
            "status_counts": self.orders_by_status(),
            "sales_history": self.revenue_by_period("daily", days=days),
            "orders_over_time": self.orders_over_time(days=days),
            "top_products": self.top_selling_products(),
            "customer_stats": self.customer_stats(),
            "delivery_stats": self.delivery_stats(),
        }
