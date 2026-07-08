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
    email=models.EmailField(blank=True)
    default_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    default_long = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

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
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.0)  # e.g. 4.25

    # Precomputed at seed time — never geocode live per ranking request
    lat = models.DecimalField(max_digits=9, decimal_places=6)
    long = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=500, blank=True)

    # Category-level "inventory" — not SKU-level (per inventory design decision)
    categories = models.ManyToManyField(Category, related_name="shops", blank=True)
    products = models.ManyToManyField(Product, related_name='shops', through='ShopProduct', blank=True)

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
        ("completed", "Completed"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    ALLOWED_TRANSITIONS = {
    "pending": ["accepted", "rejected"],
    "accepted": ["preparing"],
    "preparing": ["ready"],
    "ready": ["completed"],
    "completed": [],
    "rejected": [],
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
