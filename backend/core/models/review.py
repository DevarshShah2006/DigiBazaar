"""
Review model.

Verified-purchase reviews linked to user, shop, product, and order.
"""

from django.db import models
from django.contrib.auth.models import User

from .shop import Shop
from .product import Product
from .order import Order


class Review(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="reviews",
    )
    shop = models.ForeignKey(
        Shop,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
        null=True,
        blank=True,
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField(
        help_text="1-5 star rating",
    )
    title = models.CharField(max_length=255, blank=True)
    comment = models.TextField(blank=True)
    images = models.JSONField(
        default=list, blank=True,
        help_text="List of image URLs attached to the review",
    )

    is_verified_purchase = models.BooleanField(default=False)
    helpful_count = models.PositiveIntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    # ── Shop owner reply ────────────────────────────────────
    reply = models.TextField(blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "order"],
                name="one_review_per_order",
                condition=models.Q(order__isnull=False),
            ),
        ]

    def __str__(self):
        target = self.product.name if self.product else self.shop.name if self.shop else "—"
        return f"{self.user.username} → {target} ({self.rating}★)"
