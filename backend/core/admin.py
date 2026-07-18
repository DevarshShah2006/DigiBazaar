from django.contrib import admin
from .models import (
    Category, Subcategory, Product, ShopProduct,
    Shop, ShopOwner, UserProfile, PhoneOTP,
    Order, OrderItem, OrderTimeline,
    Rider, DeliveryAssignment,
    Inventory, InventoryLog,
    Customer, CustomerAddress,
    Payment, PaymentSettlement,
    Review, Coupon, Promotion, Notification, Wishlist,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "display_order")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Subcategory)
class SubcategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "slug", "is_active")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "brand", "category", "selling_price", "mrp", "status", "rating")
    list_filter = ("status", "category", "food_type")
    search_fields = ("name", "brand", "sku", "barcode")


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "shop_type", "tier", "city", "area", "is_open", "rating")
    list_filter = ("shop_type", "tier", "is_open", "is_verified", "city")
    search_fields = ("name", "address")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "shop", "status", "total_amount", "payment_status", "created_at")
    list_filter = ("status", "payment_status", "fulfillment_option")
    search_fields = ("invoice_number",)


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ("product", "shop", "current_stock", "reserved_stock", "reorder_level", "expiry_date")
    list_filter = ("shop",)


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("user", "purchase_count", "total_spent", "segment", "loyalty_points")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("user", "product", "shop", "rating", "is_verified_purchase", "created_at")


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ("code", "discount_type", "discount_value", "is_active", "used_count", "usage_limit")


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("order", "amount", "status", "method", "created_at")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "notification_type", "severity", "is_read", "created_at")


# Simple registrations for remaining models
admin.site.register(ShopProduct)
admin.site.register(ShopOwner)
admin.site.register(UserProfile)
admin.site.register(PhoneOTP)
admin.site.register(OrderItem)
admin.site.register(OrderTimeline)
admin.site.register(Rider)
admin.site.register(DeliveryAssignment)
admin.site.register(InventoryLog)
admin.site.register(CustomerAddress)
admin.site.register(PaymentSettlement)
admin.site.register(Promotion)
admin.site.register(Wishlist)
