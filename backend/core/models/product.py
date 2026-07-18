"""
Production-grade Product model.

Every field that a real marketplace product needs — from selling
prices and GST to nutrition, shipping dimensions, and search keywords.
"""

from django.db import models
from .category import Category, Subcategory


class Product(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("draft", "Draft"),
        ("archived", "Archived"),
    ]
    VEG_CHOICES = [
        ("veg", "Vegetarian"),
        ("non_veg", "Non-Vegetarian"),
        ("egg", "Contains Egg"),
        ("na", "Not Applicable"),
    ]

    # ── General ─────────────────────────────────────────────
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    brand = models.CharField(max_length=150, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products",
    )
    subcategory = models.ForeignKey(
        Subcategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )

    # ── Selling ─────────────────────────────────────────────
    mrp = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Maximum Retail Price",
    )
    selling_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Actual selling price on the platform",
    )
    # Keep legacy 'price' for backward compat with existing code
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity_label = models.CharField(
        max_length=50, blank=True, default="",
        help_text="Display unit, e.g. '1 kg', '500 ml', '1 pc'",
    )
    discount_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
    )
    gst_percent = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="GST percentage (5, 12, 18, 28)",
    )

    # ── Inventory identifiers ───────────────────────────────
    sku = models.CharField(max_length=100, blank=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, db_index=True)
    reorder_level = models.PositiveIntegerField(default=10)
    max_stock = models.PositiveIntegerField(default=500)

    # ── Food-specific ───────────────────────────────────────
    shelf_life = models.CharField(max_length=100, null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    storage_instructions = models.CharField(max_length=255, blank=True)
    ingredients = models.TextField(blank=True)
    nutrition_info = models.JSONField(default=dict, blank=True)
    food_type = models.CharField(
        max_length=10, choices=VEG_CHOICES, default="na",
    )

    # ── Shipping ────────────────────────────────────────────
    weight_grams = models.PositiveIntegerField(default=0)
    volume_ml = models.PositiveIntegerField(default=0)
    length_cm = models.DecimalField(
        max_digits=7, decimal_places=2, default=0,
    )
    width_cm = models.DecimalField(
        max_digits=7, decimal_places=2, default=0,
    )
    height_cm = models.DecimalField(
        max_digits=7, decimal_places=2, default=0,
    )

    # ── Marketplace ─────────────────────────────────────────
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, null=True, blank=True, default=None,
    )
    review_count = models.PositiveIntegerField(default=0)
    visibility = models.BooleanField(default=True)
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default="active",
    )

    # ── Media ───────────────────────────────────────────────
    image_url = models.URLField(blank=True)
    images = models.JSONField(
        default=list, blank=True,
        help_text="List of image URLs",
    )
    video_url = models.URLField(blank=True)

    # ── Search / metadata ───────────────────────────────────
    search_keywords = models.CharField(max_length=500, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    country_of_origin = models.CharField(
        max_length=100, blank=True, default="India",
    )

    # ── Policy ──────────────────────────────────────────────
    return_policy = models.CharField(max_length=255, blank=True)
    guarantee = models.CharField(max_length=100, null=True, blank=True)
    warranty = models.CharField(max_length=100, null=True, blank=True)

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["barcode"]),
            models.Index(fields=["brand"]),
            models.Index(fields=["status", "visibility"]),
        ]

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        """Return selling_price if set, else fall back to legacy price."""
        return self.selling_price if self.selling_price else self.price

    def save(self, *args, **kwargs):
        # Sync selling_price ↔ price for backward compatibility
        if self.selling_price and not self.price:
            self.price = self.selling_price
        elif self.price and not self.selling_price:
            self.selling_price = self.price
        # Auto-compute discount if both MRP and selling price exist
        if self.mrp and self.selling_price and self.mrp > 0:
            self.discount_percent = round(
                ((self.mrp - self.selling_price) / self.mrp) * 100, 2
            )
        super().save(*args, **kwargs)


class ShopProduct(models.Model):
    """Through-table for the Shop ↔ Product M2M relationship."""
    shop = models.ForeignKey("Shop", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    custom_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Shop-specific price override",
    )
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shop", "product"],
                name="unique_shop_product",
            ),
        ]

    def __str__(self):
        return f"{self.shop.name} – {self.product.name}"
