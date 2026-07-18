"""
Enriched Order, OrderItem, and OrderTimeline models.

Tracks the full lifecycle of an order including payment snapshots,
coupon usage, timeline events, preparation/delivery timing, refunds,
and invoice references.
"""

from django.db import models
from django.contrib.auth.models import User

from .shop import Shop
from .product import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("picked_up", "Picked Up"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    FULFILLMENT_CHOICES = [
        ("pickup", "Pickup"),
        ("shop_delivery", "Shop Delivery"),
        ("digibazaar_delivery", "DigiBazaar Delivery"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refunded", "Refunded"),
        ("partially_refunded", "Partially Refunded"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("cod", "Cash on Delivery"),
        ("upi", "UPI"),
        ("card", "Card"),
        ("wallet", "Wallet"),
        ("netbanking", "Net Banking"),
    ]

    CANCELLATION_REASON_CHOICES = [
        ("customer_request", "Customer Requested"),
        ("shop_rejected", "Shop Rejected"),
        ("auto_timeout", "Auto Timeout"),
        ("out_of_stock", "Out of Stock"),
        ("payment_failed", "Payment Failed"),
        ("delivery_issue", "Delivery Issue"),
        ("other", "Other"),
    ]

    # ── Core ────────────────────────────────────────────────
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="orders",
    )
    shop = models.ForeignKey(
        Shop, on_delete=models.CASCADE, related_name="orders",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending",
    )
    fulfillment_option = models.CharField(
        max_length=30,
        choices=FULFILLMENT_CHOICES,
        default="digibazaar_delivery",
    )

    # ── Delivery ────────────────────────────────────────────
    delivery_address = models.CharField(max_length=500, blank=True)
    lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    long = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    rider = models.ForeignKey(
        "Rider",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )

    # ── Financial ───────────────────────────────────────────
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    recommended_delivery_mode = models.CharField(
        max_length=50,
        choices=FULFILLMENT_CHOICES,
        null=True,
        blank=True,
        help_text="ML predicted best delivery mode",
    )
    delivery_mode_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Confidence percentage (0-100) of the ML prediction",
    )
    
    delivery_charge = models.DecimalField(
        max_digits=6, decimal_places=2, default=0.00,
    )
    discount_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    tax_amount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )
    total_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )

    # ── Payment ─────────────────────────────────────────────
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending",
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="cod",
    )
    payment_gateway_id = models.CharField(max_length=255, blank=True)
    transaction_id = models.CharField(max_length=255, blank=True)

    # ── Coupon ──────────────────────────────────────────────
    coupon_code = models.CharField(max_length=50, blank=True)
    coupon_discount = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )

    # ── Timeline ────────────────────────────────────────────
    placed_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    preparing_at = models.DateTimeField(null=True, blank=True)
    ready_at = models.DateTimeField(null=True, blank=True)
    picked_up_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    # ── Timing ──────────────────────────────────────────────
    preparation_time_mins = models.PositiveIntegerField(
        null=True, blank=True,
    )
    delivery_time_mins = models.PositiveIntegerField(
        null=True, blank=True,
    )

    # ── Cancellation / Refund ───────────────────────────────
    cancellation_reason = models.CharField(
        max_length=30,
        choices=CANCELLATION_REASON_CHOICES,
        blank=True,
    )
    refund_status = models.CharField(max_length=30, blank=True)
    refund_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    replacement_order = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replaced_by",
    )

    # ── Invoice ─────────────────────────────────────────────
    invoice_number = models.CharField(max_length=50, blank=True)
    invoice_generated = models.BooleanField(default=False)

    # ── Special instructions ────────────────────────────────
    customer_notes = models.TextField(blank=True)

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Status Transition Rules ─────────────────────────────
    ALLOWED_TRANSITIONS = {
        "pending": ["accepted", "rejected", "cancelled"],
        "accepted": ["preparing", "cancelled"],
        "preparing": ["ready", "cancelled"],
        "ready": ["picked_up", "out_for_delivery", "completed", "cancelled"],
        "picked_up": ["out_for_delivery", "cancelled"],
        "out_for_delivery": ["delivered", "completed", "cancelled"],
        "delivered": ["completed"],
        "completed": [],
        "rejected": [],
        "cancelled": [],
    }

    NEXT_STATUS = {
        "accepted": "preparing",
        "preparing": "ready",
        "ready": "picked_up",
        "picked_up": "out_for_delivery",
        "out_for_delivery": "delivered",
        "delivered": "completed",
    }

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "shop"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["payment_status"]),
        ]

    def can_transition(self, new_status):
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])

    def update_status(self, new_status):
        from django.utils import timezone

        if not self.can_transition(new_status):
            raise ValueError(
                f"Invalid transition from '{self.status}' to '{new_status}'"
            )
        self.status = new_status
        now = timezone.now()

        # Stamp the timeline
        timestamp_map = {
            "accepted": "accepted_at",
            "preparing": "preparing_at",
            "ready": "ready_at",
            "picked_up": "picked_up_at",
            "delivered": "delivered_at",
            "cancelled": "cancelled_at",
        }
        field = timestamp_map.get(new_status)
        if field:
            setattr(self, field, now)

        # Calculate preparation / delivery times
        if new_status == "ready" and self.accepted_at:
            delta = now - self.accepted_at
            self.preparation_time_mins = int(delta.total_seconds() / 60)
        if new_status == "delivered" and self.picked_up_at:
            delta = now - self.picked_up_at
            self.delivery_time_mins = int(delta.total_seconds() / 60)

        self.save()

        # Create timeline entry
        OrderTimeline.objects.create(
            order=self,
            status=new_status,
            timestamp=now,
        )

    def __str__(self):
        return f"Order #{self.id} ({self.status})"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items",
    )
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="order_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    price_at_order = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text="Snapshot of price when ordered — don't rely on live Product.price",
    )
    discount_at_order = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
    )

    def __str__(self):
        return f"{self.quantity} × {self.product.name}"

    @property
    def line_total(self):
        return self.price_at_order * self.quantity


class OrderTimeline(models.Model):
    """Detailed status history for an order."""

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="timeline",
    )
    status = models.CharField(max_length=30)
    timestamp = models.DateTimeField()
    note = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"Order #{self.order_id} → {self.status} at {self.timestamp}"
