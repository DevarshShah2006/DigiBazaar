"""
core/models.py — Digibazaar Day 1 whiteboard models

Agreed field names — DO NOT rename after Day 1 without telling the whole team.
Changing a field name on Day 4 breaks three people's code at once.
"""

from django.db import models
from django.contrib.auth.models import User


# -----------------------------
# Category
# -----------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    def __str__(self):
        return self.name


# -----------------------------
# Product (catalog, seeded from BigBasket + Flipkart Fashion)
# -----------------------------
class Product(models.Model):
    name = models.CharField(max_length=255)

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        related_name="products"
    )

    brand = models.CharField(max_length=150, blank=True)

    description = models.TextField(blank=True)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.0
    )

    image_url = models.URLField(blank=True)

    # Applicable for selected products only
    guarantee = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    warranty = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    shelf_life = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class ShopProduct(models.Model):
    shop = models.ForeignKey('Shop', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['shop', 'product'], name='unique_shop_product'),
        ]

    def __str__(self):
        return f'{self.shop.name} - {self.product.name}'


# -----------------------------
# ShopOwner (extends User via OneToOne — Django's built-in auth handles login)
# -----------------------------
class ShopOwner(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="shop_owner_profile")
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return self.user.username


# -----------------------------
# UserProfile (for regular customers — optional extra fields beyond Django's User)
# -----------------------------
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    default_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    default_long = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    default_address = models.CharField(max_length=500, blank=True)

    def __str__(self):
        return self.user.username


# -----------------------------
# Rider (for delivery partners)
# -----------------------------
class Rider(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="rider_profile")
    phone = models.CharField(max_length=20, blank=True)
    is_online = models.BooleanField(default=False)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    long = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    vehicle_type = models.CharField(max_length=50, blank=True)
    vehicle_number = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.user.username


# -----------------------------
# Shop
# -----------------------------
class Shop(models.Model):
    TIER_CHOICES = [
        ("free", "Free"),
        ("premium", "Premium"),
    ]

    owner = models.ForeignKey(ShopOwner, on_delete=models.CASCADE, related_name="shops")
    name = models.CharField(max_length=255)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default="free")
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)

    # Precomputed at seed time — never geocode live per ranking request
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    long = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=500, blank=True)

    # Category-level "inventory" — not SKU-level (per inventory design decision)
    categories = models.ManyToManyField(Category, related_name="shops", blank=True)
    products = models.ManyToManyField(Product, related_name='shops', through='ShopProduct', blank=True)

    live_inventory = models.BooleanField(default=False)
    reliability_score = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    cancellation_rate = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# -----------------------------
# Order
# -----------------------------
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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    fulfillment_option = models.CharField(max_length=30, choices=FULFILLMENT_CHOICES, default="digibazaar_delivery")
    delivery_address = models.CharField(max_length=500, blank=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    long = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_charge = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    rider = models.ForeignKey(Rider, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    # Linear next-step map for statuses that only have one legal forward
    # transition.
    NEXT_STATUS = {
        "accepted": "preparing",
        "preparing": "ready",
        "ready": "picked_up",
        "picked_up": "out_for_delivery",
        "out_for_delivery": "delivered",
        "delivered": "completed",
    }

    def can_transition(self, new_status):
        return new_status in self.ALLOWED_TRANSITIONS.get(self.status, [])

    def update_status(self, new_status):
        if not self.can_transition(new_status):
            raise ValueError(
                f"Invalid transition from '{self.status}' to '{new_status}'"
            )

        self.status = new_status
        self.save()

    def __str__(self):
        return f"Order #{self.id} ({self.status})"


# -----------------------------
# OrderItem
# -----------------------------
class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="order_items")
    quantity = models.PositiveIntegerField(default=1)
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2)  # snapshot, don't rely on live Product.price

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"


# -----------------------------
# Wishlist
# -----------------------------
class Wishlist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="wishlist_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wishlisted_by")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='unique_user_wishlist'),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.product.name}"


# -----------------------------
# DeliveryAssignment
# -----------------------------
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

class DeliveryAssignment(models.Model):
    STATUS_CHOICES = [
        ("assigned", "Assigned"),
        ("picked_up", "Picked Up"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="delivery_assignments")
    rider = models.ForeignKey(Rider, on_delete=models.CASCADE, related_name="assignments")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="assigned")
    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    eta = models.IntegerField(default=15)

    def __str__(self):
        return f"Assignment {self.id} - Order #{self.order.id} to {self.rider.user.username}"

