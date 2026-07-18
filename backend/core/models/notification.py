"""
Notification model.

In-app notifications for shop owners, customers, and riders.
"""

from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):
    TYPE_CHOICES = [
        ("order_new", "New Order"),
        ("order_update", "Order Status Update"),
        ("low_stock", "Low Stock Alert"),
        ("out_of_stock", "Out of Stock"),
        ("expiry_alert", "Expiry Alert"),
        ("payment", "Payment Update"),
        ("promotion", "Promotion"),
        ("review", "New Review"),
        ("system", "System"),
        ("ai_insight", "AI Insight"),
    ]

    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("warning", "Warning"),
        ("urgent", "Urgent"),
        ("success", "Success"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default="system",
    )
    severity = models.CharField(
        max_length=10, choices=SEVERITY_CHOICES, default="info",
    )

    is_read = models.BooleanField(default=False)
    action_url = models.CharField(
        max_length=500, blank=True,
        help_text="Deep link or path the user should navigate to",
    )
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Extra context (order_id, product_id, etc.)",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
        ]

    def __str__(self):
        return f"{self.title} → {self.user.username}"
