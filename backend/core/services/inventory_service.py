"""
InventoryService — stock management and alerts.

Handles stock adjustments, low-stock detection, expiry alerts,
and days-of-stock-remaining calculations.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Avg, F, Sum
from django.utils import timezone

from core.models import Inventory, InventoryLog, OrderItem


class InventoryService:
    """Business logic for inventory management."""

    @staticmethod
    def get_shop_inventory(shop, include_out_of_stock=True):
        """Get all inventory records for a shop."""
        qs = Inventory.objects.filter(shop=shop).select_related("product")
        if not include_out_of_stock:
            qs = qs.filter(current_stock__gt=0)
        return qs

    @staticmethod
    def adjust_stock(inventory, quantity_change, change_type, reference=""):
        """Adjust stock and log the change."""
        inventory.current_stock = max(0, inventory.current_stock + quantity_change)
        inventory.save(update_fields=["current_stock", "updated_at"])

        InventoryLog.objects.create(
            inventory=inventory,
            change_type=change_type,
            quantity_change=quantity_change,
            stock_after=inventory.current_stock,
            reference=reference,
        )
        return inventory

    @staticmethod
    def reserve_stock(inventory, quantity, order_id):
        """Reserve stock for a new order."""
        if inventory.available_stock < quantity:
            raise ValueError(
                f"Insufficient stock: {inventory.available_stock} available, "
                f"{quantity} requested"
            )
        inventory.reserved_stock += quantity
        inventory.save(update_fields=["reserved_stock", "updated_at"])

        InventoryLog.objects.create(
            inventory=inventory,
            change_type="reserved",
            quantity_change=-quantity,
            stock_after=inventory.current_stock,
            reference=f"Order #{order_id}",
        )

    @staticmethod
    def release_stock(inventory, quantity, order_id):
        """Release reserved stock (e.g., on cancellation)."""
        inventory.reserved_stock = max(0, inventory.reserved_stock - quantity)
        inventory.save(update_fields=["reserved_stock", "updated_at"])

        InventoryLog.objects.create(
            inventory=inventory,
            change_type="released",
            quantity_change=quantity,
            stock_after=inventory.current_stock,
            reference=f"Order #{order_id} cancelled",
        )

    @staticmethod
    def confirm_sale(inventory, quantity, order_id):
        """Confirm stock reduction on order completion."""
        inventory.current_stock = max(0, inventory.current_stock - quantity)
        inventory.reserved_stock = max(0, inventory.reserved_stock - quantity)
        inventory.save(update_fields=["current_stock", "reserved_stock", "updated_at"])

        InventoryLog.objects.create(
            inventory=inventory,
            change_type="sale",
            quantity_change=-quantity,
            stock_after=inventory.current_stock,
            reference=f"Order #{order_id} completed",
        )

    @staticmethod
    def get_low_stock_items(shop):
        """Products below reorder level."""
        return Inventory.objects.filter(
            shop=shop,
            current_stock__gt=0,
            current_stock__lte=F("reorder_level"),
        ).select_related("product")

    @staticmethod
    def get_out_of_stock_items(shop):
        return Inventory.objects.filter(
            shop=shop, current_stock=0,
        ).select_related("product")

    @staticmethod
    def get_expiring_items(shop, days_ahead=3):
        """Products expiring within `days_ahead` days."""
        cutoff = timezone.now().date() + timedelta(days=days_ahead)
        return Inventory.objects.filter(
            shop=shop,
            expiry_date__isnull=False,
            expiry_date__lte=cutoff,
            expiry_date__gte=timezone.now().date(),
            current_stock__gt=0,
        ).select_related("product")

    @staticmethod
    def get_avg_daily_sales(shop, product, days=30):
        """Average daily sales of a product in the last N days."""
        cutoff = timezone.now() - timedelta(days=days)
        total_sold = (
            OrderItem.objects.filter(
                order__shop=shop,
                product=product,
                order__status__in=["completed", "delivered"],
                order__created_at__gte=cutoff,
            ).aggregate(total=Sum("quantity"))["total"]
            or 0
        )
        return round(total_sold / max(days, 1), 2)

    @staticmethod
    def get_days_of_stock_remaining(inventory, avg_daily_sales=None):
        """Estimate how many days current stock will last."""
        if avg_daily_sales is None:
            avg_daily_sales = InventoryService.get_avg_daily_sales(
                inventory.shop, inventory.product,
            )
        if avg_daily_sales <= 0:
            return None  # Can't estimate without sales data
        return round(inventory.available_stock / avg_daily_sales, 1)

    @staticmethod
    def restock(inventory, quantity, supplier_name="", purchase_price=None):
        """Record a restock event."""
        inventory.current_stock += quantity
        inventory.last_restocked = timezone.now()
        if supplier_name:
            inventory.supplier_name = supplier_name
        if purchase_price is not None:
            inventory.purchase_price = purchase_price
        inventory.save()

        InventoryLog.objects.create(
            inventory=inventory,
            change_type="restock",
            quantity_change=quantity,
            stock_after=inventory.current_stock,
            reference=f"Restocked from {supplier_name}" if supplier_name else "Restocked",
        )
        return inventory
