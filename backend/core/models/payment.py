"""
Payment and PaymentSettlement models.

Tracks every payment event: status, gateway, refunds,
commissions, platform fees, and settlement payouts to shops.
"""

from django.db import models
from .order import Order
from .shop import Shop


class Payment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("partially_refunded", "Partially Refunded"),
    ]

    METHOD_CHOICES = [
        ("cod", "Cash on Delivery"),
        ("upi", "UPI"),
        ("card", "Card"),
        ("wallet", "Wallet"),
        ("netbanking", "Net Banking"),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="payments",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending",
    )
    method = models.CharField(
        max_length=20, choices=METHOD_CHOICES, default="cod",
    )
    gateway = models.CharField(
        max_length=50, blank=True,
        help_text="Payment gateway name (Razorpay, Paytm, etc.)",
    )
    transaction_id = models.CharField(max_length=255, blank=True)
    gateway_order_id = models.CharField(max_length=255, blank=True)

    # ── Fees ────────────────────────────────────────────────
    commission_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text="Platform commission",
    )
    platform_fee = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    tax_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )

    # ── Refund ──────────────────────────────────────────────
    refund_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    refund_status = models.CharField(max_length=30, blank=True)
    refund_id = models.CharField(max_length=255, blank=True)

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment {self.id} — ₹{self.amount} ({self.status})"


class PaymentSettlement(models.Model):
    """Payout record from platform to shop."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("settled", "Settled"),
        ("failed", "Failed"),
    ]

    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="settlements",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    commission_deducted = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    tax_deducted = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    net_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending",
    )
    settlement_date = models.DateField(null=True, blank=True)
    utr_number = models.CharField(
        max_length=100, blank=True,
        help_text="Unique Transaction Reference for bank transfer",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Settlement #{self.id} — ₹{self.net_amount} to {self.shop.name}"
