"""
DashboardService — aggregates all KPIs for the shop dashboard.

Every number on the dashboard comes from this service which
queries the database. Zero hardcoded values.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import (
    Avg, Count, F, Q, Sum, Value, Case, When,
    DecimalField as DjDecimalField,
)
from django.db.models.functions import TruncDate, TruncHour, Coalesce
from django.utils import timezone

from core.models import (
    Order, OrderItem, Shop, Product, Inventory,
    Customer, Review, Notification,
)


class DashboardService:
    """Build the unified dashboard payload for a shop owner."""

    def __init__(self, owner):
        self.owner = owner
        self.shops = Shop.objects.filter(owner=owner)
        self.shop_ids = list(self.shops.values_list("id", flat=True))
        self.now = timezone.now()
        self.today_start = self.now.replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    # ─── Shop Info ──────────────────────────────────────────

    def get_shop_info(self):
        shop = self.shops.first()
        if not shop:
            return {}
        return {
            "id": shop.id,
            "name": shop.name,
            "shop_type": shop.shop_type,
            "is_open": shop.is_open,
            "live_inventory": shop.live_inventory,
            "rating": float(shop.rating),
            "review_count": shop.review_count,
            "tier": shop.tier,
            "delivery_radius_km": float(shop.delivery_radius_km),
            "avg_preparation_time_mins": shop.avg_preparation_time_mins,
        }

    # ─── Today's KPIs ──────────────────────────────────────

    def get_today_kpis(self):
        today_orders = Order.objects.filter(
            shop_id__in=self.shop_ids,
            created_at__gte=self.today_start,
        )

        completed_today = today_orders.filter(
            status__in=["completed", "delivered"]
        )

        # Revenue from completed order items
        revenue = (
            OrderItem.objects.filter(
                order__shop_id__in=self.shop_ids,
                order__status__in=["completed", "delivered"],
                order__created_at__gte=self.today_start,
            ).aggregate(
                total=Coalesce(
                    Sum(F("price_at_order") * F("quantity")),
                    Value(Decimal("0")),
                    output_field=DjDecimalField(),
                )
            )["total"]
        )

        status_counts = dict(
            today_orders.values_list("status")
            .annotate(count=Count("id"))
            .values_list("status", "count")
        )

        # Average order value
        avg_value = (
            completed_today.annotate(
                order_total=Sum(F("items__price_at_order") * F("items__quantity"))
            ).aggregate(avg=Avg("order_total"))["avg"]
            or Decimal("0")
        )

        # New vs returning customers today
        today_user_ids = set(
            today_orders.values_list("user_id", flat=True)
        )
        previous_user_ids = set(
            Order.objects.filter(
                shop_id__in=self.shop_ids,
                created_at__lt=self.today_start,
            ).values_list("user_id", flat=True)
        )
        new_customers = len(today_user_ids - previous_user_ids)
        returning_customers = len(today_user_ids & previous_user_ids)

        return {
            "revenue": float(revenue),
            "orders_count": today_orders.count(),
            "completed_orders": completed_today.count(),
            "pending_orders": status_counts.get("pending", 0),
            "accepted_orders": status_counts.get("accepted", 0),
            "preparing_orders": status_counts.get("preparing", 0),
            "cancelled_orders": status_counts.get("cancelled", 0),
            "rejected_orders": status_counts.get("rejected", 0),
            "average_order_value": float(avg_value),
            "new_customers": new_customers,
            "returning_customers": returning_customers,
        }

    # ─── Monthly Revenue ────────────────────────────────────

    def get_monthly_revenue(self):
        month_start = self.now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        revenue = (
            OrderItem.objects.filter(
                order__shop_id__in=self.shop_ids,
                order__status__in=["completed", "delivered"],
                order__created_at__gte=month_start,
            ).aggregate(
                total=Coalesce(
                    Sum(F("price_at_order") * F("quantity")),
                    Value(Decimal("0")),
                    output_field=DjDecimalField(),
                )
            )["total"]
        )
        return float(revenue)

    # ─── Active / Recent Orders ─────────────────────────────

    def get_active_orders(self, limit=20):
        return list(
            Order.objects.filter(
                shop_id__in=self.shop_ids,
                status__in=["pending", "accepted", "preparing", "ready",
                             "picked_up", "out_for_delivery"],
            )
            .select_related("user", "shop", "rider")
            .prefetch_related("items", "items__product")
            .order_by("-created_at")[:limit]
        )

    def get_recent_orders(self, limit=10):
        return list(
            Order.objects.filter(shop_id__in=self.shop_ids)
            .select_related("user", "shop")
            .prefetch_related("items", "items__product")
            .order_by("-created_at")[:limit]
        )

    # ─── Inventory Alerts ───────────────────────────────────

    def get_inventory_alerts(self):
        low_stock = list(
            Inventory.objects.filter(
                shop_id__in=self.shop_ids,
                current_stock__gt=0,
                current_stock__lte=F("reorder_level"),
            ).select_related("product")[:10]
        )

        out_of_stock = list(
            Inventory.objects.filter(
                shop_id__in=self.shop_ids,
                current_stock=0,
            ).select_related("product")[:10]
        )

        expiring_soon = list(
            Inventory.objects.filter(
                shop_id__in=self.shop_ids,
                expiry_date__isnull=False,
                expiry_date__lte=self.now.date() + timedelta(days=3),
                expiry_date__gte=self.now.date(),
                current_stock__gt=0,
            ).select_related("product")[:10]
        )

        return {
            "low_stock": [
                {
                    "product_name": inv.product.name,
                    "current_stock": inv.current_stock,
                    "reorder_level": inv.reorder_level,
                }
                for inv in low_stock
            ],
            "out_of_stock": [
                {"product_name": inv.product.name}
                for inv in out_of_stock
            ],
            "expiring_soon": [
                {
                    "product_name": inv.product.name,
                    "expiry_date": inv.expiry_date.isoformat() if inv.expiry_date else None,
                    "current_stock": inv.current_stock,
                }
                for inv in expiring_soon
            ],
        }

    # ─── Quick Analytics ────────────────────────────────────

    def get_sales_trend_7d(self):
        seven_days_ago = self.now - timedelta(days=7)
        data = (
            OrderItem.objects.filter(
                order__shop_id__in=self.shop_ids,
                order__status__in=["completed", "delivered"],
                order__created_at__gte=seven_days_ago,
            )
            .annotate(date=TruncDate("order__created_at"))
            .values("date")
            .annotate(revenue=Sum(F("price_at_order") * F("quantity")))
            .order_by("date")
        )
        return [
            {
                "date": item["date"].isoformat() if item["date"] else "",
                "revenue": float(item["revenue"] or 0),
            }
            for item in data
        ]

    def get_top_products(self, limit=5):
        data = (
            OrderItem.objects.filter(
                order__shop_id__in=self.shop_ids,
                order__status__in=["completed", "delivered"],
            )
            .values("product__name")
            .annotate(
                sold_count=Sum("quantity"),
                revenue=Sum(F("price_at_order") * F("quantity")),
            )
            .order_by("-sold_count")[:limit]
        )
        return [
            {
                "product_name": item["product__name"],
                "sold_count": item["sold_count"],
                "revenue": float(item["revenue"] or 0),
            }
            for item in data
        ]

    def get_order_status_distribution(self):
        data = (
            Order.objects.filter(shop_id__in=self.shop_ids)
            .values("status")
            .annotate(count=Count("id"))
        )
        return {item["status"]: item["count"] for item in data}

    # ─── Alerts ─────────────────────────────────────────────

    def get_system_alerts(self):
        """Combine inventory alerts + pending-order alerts."""
        alerts = []

        # Pending orders that need attention
        pending = Order.objects.filter(
            shop_id__in=self.shop_ids,
            status="pending",
        ).count()
        if pending > 0:
            alerts.append({
                "type": "pending_order",
                "message": f"{pending} order(s) waiting for approval",
                "severity": "urgent",
            })

        # Low stock
        low_stock_count = Inventory.objects.filter(
            shop_id__in=self.shop_ids,
            current_stock__gt=0,
            current_stock__lte=F("reorder_level"),
        ).count()
        if low_stock_count > 0:
            alerts.append({
                "type": "low_stock",
                "message": f"{low_stock_count} product(s) running low on stock",
                "severity": "warning",
            })

        # Out of stock
        oos_count = Inventory.objects.filter(
            shop_id__in=self.shop_ids,
            current_stock=0,
        ).count()
        if oos_count > 0:
            alerts.append({
                "type": "out_of_stock",
                "message": f"{oos_count} product(s) are out of stock",
                "severity": "urgent",
            })

        return alerts

    # ─── Full Dashboard Payload ─────────────────────────────

    def build(self):
        """Return the complete unified dashboard payload."""
        return {
            "shop": self.get_shop_info(),
            "today": self.get_today_kpis(),
            "monthly_revenue": self.get_monthly_revenue(),
            "inventory": self.get_inventory_alerts(),
            "analytics": {
                "sales_trend_7d": self.get_sales_trend_7d(),
                "top_products": self.get_top_products(),
                "order_status_distribution": self.get_order_status_distribution(),
            },
            "alerts": self.get_system_alerts(),
        }
