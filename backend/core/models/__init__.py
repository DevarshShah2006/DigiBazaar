"""
core.models — Package init.

Re-exports every model so that existing imports like
``from core.models import Product, Shop, Order`` continue to work.
"""

# ── Category ────────────────────────────────────────────────
from .category import Category, Subcategory

# ── Auth / Profiles ─────────────────────────────────────────
from .auth import ShopOwner, UserProfile, PhoneOTP

# ── Product ─────────────────────────────────────────────────
from .product import Product, ShopProduct

# ── Shop ────────────────────────────────────────────────────
from .shop import Shop

# ── Inventory ───────────────────────────────────────────────
from .inventory import Inventory, InventoryLog

# ── Order ───────────────────────────────────────────────────
from .order import Order, OrderItem, OrderTimeline

# ── Delivery ────────────────────────────────────────────────
from .delivery import Rider, DeliveryAssignment

# ── Customer ────────────────────────────────────────────────
from .customer import Customer, CustomerAddress

# ── Payment ─────────────────────────────────────────────────
from .payment import Payment, PaymentSettlement

# ── Review ──────────────────────────────────────────────────
from .review import Review

# ── Coupon ──────────────────────────────────────────────────
from .coupon import Coupon, Promotion

# ── Notification ────────────────────────────────────────────
from .notification import Notification

# ── Wishlist ────────────────────────────────────────────────
from .wishlist import Wishlist

# ── Demand Forecast ─────────────────────────────────────────
from .demand_forecast import DemandForecast

# ── Market Trends ───────────────────────────────────────────
from .market_search_trend import MarketSearchTrend

__all__ = [
    # Category
    "Category",
    "Subcategory",
    # Auth
    "ShopOwner",
    "UserProfile",
    "PhoneOTP",
    # Product
    "Product",
    "ShopProduct",
    # Shop
    "Shop",
    # Inventory
    "Inventory",
    "InventoryLog",
    # Order
    "Order",
    "OrderItem",
    "OrderTimeline",
    # Delivery
    "Rider",
    "DeliveryAssignment",
    # Customer
    "Customer",
    "CustomerAddress",
    # Payment
    "Payment",
    "PaymentSettlement",
    # Review
    "Review",
    # Coupon
    "Coupon",
    "Promotion",
    # Notification
    "Notification",
    # Wishlist
    "Wishlist",
    # Demand Forecast
    "DemandForecast",
    # Market Trends
    "MarketSearchTrend",
]
