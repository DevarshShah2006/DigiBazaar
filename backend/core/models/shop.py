"""
Production-grade Shop model.

Covers legal docs (GST, FSSAI), banking, delivery configuration,
operating hours, verification, and scoring — everything a local
commerce marketplace needs.
"""

from django.db import models
from .auth import ShopOwner
from .category import Category
from .product import Product, ShopProduct


class Shop(models.Model):
    TIER_CHOICES = [
        ("free", "Free"),
        ("premium", "Premium"),
    ]
    SHOP_TYPE_CHOICES = [
        ("kirana", "Kirana / Grocery"),
        ("medical", "Medical / Pharmacy"),
        ("snacks", "Snacks / Bakery"),
        ("clothing", "Clothing / Fashion"),
        ("household", "Household / Utilities"),
        ("pet", "Pet Shop"),
        ("electronics", "Electronics"),
        ("other", "Other"),
    ]

    # ── Core ────────────────────────────────────────────────
    owner = models.ForeignKey(
        ShopOwner, on_delete=models.CASCADE, related_name="shops",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    shop_type = models.CharField(
        max_length=20, choices=SHOP_TYPE_CHOICES, default="kirana",
    )
    tier = models.CharField(
        max_length=10, choices=TIER_CHOICES, default="free",
    )
    logo_url = models.URLField(blank=True)
    banner_url = models.URLField(blank=True)

    # ── Legal ───────────────────────────────────────────────
    gst_number = models.CharField(max_length=20, blank=True)
    fssai_license = models.CharField(max_length=20, blank=True)
    trade_license = models.CharField(max_length=50, blank=True)

    # ── Financial ───────────────────────────────────────────
    bank_account_name = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=30, blank=True)
    bank_ifsc = models.CharField(max_length=20, blank=True)
    upi_id = models.CharField(max_length=100, blank=True)

    # ── Location ────────────────────────────────────────────
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    long = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=500, blank=True)
    area = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True, default="Ahmedabad")
    state = models.CharField(max_length=100, blank=True, default="Gujarat")
    pincode = models.CharField(max_length=10, blank=True)
    delivery_radius_km = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.00,
    )

    # ── Operating Hours ─────────────────────────────────────
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
    holiday_schedule = models.JSONField(
        default=list, blank=True,
        help_text='List of holiday dates, e.g. ["2026-01-26", "2026-08-15"]',
    )

    # ── Delivery Configuration ──────────────────────────────
    pickup_enabled = models.BooleanField(default=True)
    self_delivery_enabled = models.BooleanField(default=False)
    digibazaar_delivery_enabled = models.BooleanField(default=True)
    min_order_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    delivery_charge_flat = models.DecimalField(
        max_digits=6, decimal_places=2, default=25.00,
    )
    free_delivery_above = models.DecimalField(
        max_digits=8, decimal_places=2, default=500.00,
    )

    # ── Relations ───────────────────────────────────────────
    categories = models.ManyToManyField(
        Category, related_name="shops", blank=True,
    )
    products = models.ManyToManyField(
        Product,
        related_name="shops",
        through=ShopProduct,
        blank=True,
    )

    # ── Scoring & Metrics ───────────────────────────────────
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.0,
    )
    review_count = models.PositiveIntegerField(default=0)
    live_inventory = models.BooleanField(default=False)
    reliability_score = models.DecimalField(
        max_digits=3, decimal_places=2, default=1.00,
    )
    cancellation_rate = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
    )
    avg_preparation_time_mins = models.PositiveIntegerField(
        default=15,
        help_text="Average order preparation time in minutes",
    )
    total_orders_served = models.PositiveIntegerField(default=0)

    # ── Verification ────────────────────────────────────────
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateField(null=True, blank=True)

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-rating"]
        indexes = [
            models.Index(fields=["city", "area"]),
            models.Index(fields=["is_open", "is_verified"]),
            models.Index(fields=["lat", "long"]),
        ]

    def __str__(self):
        return self.name
