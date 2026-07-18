"""
Separate Inventory model.

Stock is NOT stored inside Product — this allows multiple shops to
sell the same product with different stock levels, batches, suppliers,
and expiry dates.
"""

from django.db import models
from .product import Product
from .shop import Shop


class Inventory(models.Model):
    """Per-shop, per-product stock record."""

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="inventory_items",
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="inventory_records",
    )

    # ── Stock levels ────────────────────────────────────────
    current_stock = models.PositiveIntegerField(default=0)
    reserved_stock = models.PositiveIntegerField(
        default=0,
        help_text="Units currently reserved by active orders",
    )
    incoming_stock = models.PositiveIntegerField(
        default=0,
        help_text="Units expected from supplier",
    )

    # ── Thresholds ──────────────────────────────────────────
    reorder_level = models.PositiveIntegerField(default=10)
    min_stock = models.PositiveIntegerField(default=5)
    max_stock = models.PositiveIntegerField(default=500)

    # ── Batch / Supplier ────────────────────────────────────
    batch_number = models.CharField(max_length=100, blank=True)
    supplier_name = models.CharField(max_length=255, blank=True)
    purchase_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    selling_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Shop-specific selling price for this batch",
    )

    # ── Expiry ──────────────────────────────────────────────
    expiry_date = models.DateField(null=True, blank=True)
    warehouse_location = models.CharField(max_length=100, blank=True)

    # ── Timestamps ──────────────────────────────────────────
    last_restocked = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "inventory"
        ordering = ["product__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "product", "batch_number"],
                name="unique_shop_product_batch",
            ),
        ]
        indexes = [
            models.Index(fields=["shop", "current_stock"]),
            models.Index(fields=["expiry_date"]),
        ]

    def __str__(self):
        return f"{self.shop.name} — {self.product.name} ({self.current_stock} units)"

    @property
    def available_stock(self):
        """Units actually available for new orders."""
        return max(0, self.current_stock - self.reserved_stock)

    @property
    def is_low_stock(self):
        return self.current_stock <= self.reorder_level

    @property
    def is_out_of_stock(self):
        return self.current_stock == 0

    @property
    def days_of_stock_remaining(self):
        """Rough estimate; caller should provide avg_daily_sales."""
        return None  # Calculated by InventoryService with sales data


class InventoryLog(models.Model):
    """Audit trail for every stock change."""

    CHANGE_TYPE_CHOICES = [
        ("restock", "Restocked"),
        ("sale", "Sold"),
        ("reserved", "Reserved"),
        ("released", "Released"),
        ("expired", "Expired / Removed"),
        ("adjustment", "Manual Adjustment"),
        ("return", "Returned"),
    ]

    inventory = models.ForeignKey(
        Inventory, on_delete=models.CASCADE, related_name="logs",
    )
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    quantity_change = models.IntegerField(
        help_text="Positive for additions, negative for removals",
    )
    stock_after = models.PositiveIntegerField()
    reference = models.CharField(
        max_length=255, blank=True,
        help_text="Order ID, supplier invoice, or reason",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.get_change_type_display()} "
            f"{self.quantity_change:+d} → {self.stock_after}"
        )
