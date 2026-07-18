"""
Rider and DeliveryAssignment models.
"""

from django.db import models
from django.contrib.auth.models import User


class Rider(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="rider_profile",
    )
    phone = models.CharField(max_length=20, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    is_online = models.BooleanField(default=False)
    lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    long = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
    )
    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=5.00,
    )
    vehicle_type = models.CharField(max_length=50, blank=True)
    vehicle_number = models.CharField(max_length=50, blank=True)
    total_deliveries = models.PositiveIntegerField(default=0)
    total_earnings = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username


class DeliveryAssignment(models.Model):
    STATUS_CHOICES = [
        ("assigned", "Assigned"),
        ("picked_up", "Picked Up"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    order = models.ForeignKey(
        "Order", on_delete=models.CASCADE, related_name="delivery_assignments",
    )
    rider = models.ForeignKey(
        Rider, on_delete=models.CASCADE, related_name="assignments",
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="assigned",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    eta = models.IntegerField(default=15, help_text="Estimated minutes")
    actual_delivery_time_mins = models.PositiveIntegerField(
        null=True, blank=True,
    )
    distance_km = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
    )

    def __str__(self):
        return f"Assignment {self.id} — Order #{self.order_id} to {self.rider.user.username}"
