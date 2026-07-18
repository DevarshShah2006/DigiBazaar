"""
Coupon and Promotion models.

Supports percentage and flat-value discounts with usage limits,
validity windows, and applicability rules for shops/categories.
"""

from django.db import models
from .shop import Shop
from .category import Category


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("flat", "Flat Amount"),
    ]

    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.CharField(max_length=255, blank=True)
    discount_type = models.CharField(
        max_length=20, choices=DISCOUNT_TYPE_CHOICES, default="percentage",
    )
    discount_value = models.DecimalField(max_digits=8, decimal_places=2)
    min_order_value = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    max_discount = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Cap on percentage discounts",
    )

    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()

    usage_limit = models.PositiveIntegerField(
        default=0, help_text="0 = unlimited",
    )
    used_count = models.PositiveIntegerField(default=0)
    per_user_limit = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)

    # ── Applicability ───────────────────────────────────────
    applicable_shops = models.ManyToManyField(
        Shop, related_name="coupons", blank=True,
        help_text="Leave empty for all shops",
    )
    applicable_categories = models.ManyToManyField(
        Category, related_name="coupons", blank=True,
        help_text="Leave empty for all categories",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()} {self.discount_value})"

    @property
    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        if not self.is_active:
            return False
        if now < self.valid_from or now > self.valid_until:
            return False
        if self.usage_limit and self.used_count >= self.usage_limit:
            return False
        return True


class Promotion(models.Model):
    """Shop-created promotional campaigns (banner, flash sales, etc.)."""

    PROMO_TYPE_CHOICES = [
        ("banner", "Banner Ad"),
        ("flash_sale", "Flash Sale"),
        ("buy_one_get_one", "Buy One Get One"),
        ("bundle", "Bundle Deal"),
    ]

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="promotions",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    promo_type = models.CharField(
        max_length=20, choices=PROMO_TYPE_CHOICES, default="banner",
    )
    banner_image_url = models.URLField(blank=True)
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="promotions",
    )
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.title} ({self.shop.name})"
