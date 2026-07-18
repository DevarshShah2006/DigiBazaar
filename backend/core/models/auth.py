"""
Auth-related profile models.

ShopOwner — extends User for shop owners.
UserProfile — extends User for customers.
PhoneOTP — OTP verification records.
"""

from django.db import models
from django.contrib.auth.models import User


class ShopOwner(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="shop_owner_profile"
    )
    phone = models.CharField(max_length=20, blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    pan_number = models.CharField(max_length=20, blank=True)
    aadhar_number = models.CharField(max_length=20, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username


class UserProfile(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="profile"
    )
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    full_name = models.CharField(max_length=255, blank=True)
    default_lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    default_long = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    default_address = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username


class PhoneOTP(models.Model):
    phone = models.CharField(max_length=20, unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def is_valid(self):
        from django.utils import timezone
        return timezone.now() < self.expires_at

    def __str__(self):
        return f"OTP for {self.phone}"
