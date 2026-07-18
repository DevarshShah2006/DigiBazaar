"""
Customer model — enriched customer profile.

Extends UserProfile with commerce-specific fields:
purchase history stats, lifetime value, loyalty points,
favorite categories, and wallet.
"""

from django.db import models
from django.contrib.auth.models import User


class Customer(models.Model):
    """Commerce-enriched customer profile (linked to User)."""

    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="customer_profile",
    )

    # ── Stats (recomputed periodically by analytics service) ─
    purchase_count = models.PositiveIntegerField(default=0)
    total_spent = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )
    average_order_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    lifetime_value = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
    )
    repeat_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Percentage of orders that are repeat purchases",
    )
    last_order_date = models.DateTimeField(null=True, blank=True)

    # ── Preferences ─────────────────────────────────────────
    favorite_categories = models.JSONField(
        default=list, blank=True,
        help_text='List of category slugs, e.g. ["dairy", "snacks"]',
    )
    favorite_shops = models.ManyToManyField(
        "Shop", related_name="favorited_by", blank=True,
    )

    # ── Wallet & Loyalty ────────────────────────────────────
    wallet_balance = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    loyalty_points = models.PositiveIntegerField(default=0)

    # ── Segment (computed by ML) ────────────────────────────
    segment = models.CharField(
        max_length=50, blank=True,
        help_text="RFM segment, e.g. Champion, At Risk, Lost",
    )

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Customer: {self.user.username}"


class CustomerAddress(models.Model):
    """Multiple saved addresses per customer."""

    ADDRESS_TYPE_CHOICES = [
        ("home", "Home"),
        ("work", "Work"),
        ("other", "Other"),
    ]

    customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, related_name="addresses",
    )
    label = models.CharField(
        max_length=20, choices=ADDRESS_TYPE_CHOICES, default="home",
    )
    full_address = models.CharField(max_length=500)
    landmark = models.CharField(max_length=255, blank=True)
    lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    long = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    city = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "-created_at"]

    def __str__(self):
        return f"{self.label}: {self.full_address[:60]}"
