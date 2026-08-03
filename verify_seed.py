import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import sys
sys.path.insert(0, "backend")
django.setup()

from core.models import (Order, OrderItem, OrderTimeline, Rider, Customer,
                         Review, DemandForecast, Notification, Coupon, Shop,
                         DeliveryAssignment, Wishlist, MarketSearchTrend)
from django.db.models import Count, Sum, Avg

print("=== DigiBazaar Database Final Counts ===")
print(f"Shops:               {Shop.objects.count()} (36 original Ahmedabad shops)")
print(f"Customers:           {Customer.objects.count()}")
print(f"Riders:              {Rider.objects.count()}")
print(f"Orders:              {Order.objects.count()}")
print(f"OrderItems:          {OrderItem.objects.count()}")
print(f"OrderTimeline rows:  {OrderTimeline.objects.count()}")
print(f"DeliveryAssign:      {DeliveryAssignment.objects.count()}")
print(f"Reviews:             {Review.objects.count()}")
print(f"Coupons:             {Coupon.objects.count()}")
print(f"SearchTrends:        {MarketSearchTrend.objects.count()}")
print(f"WishlistItems:       {Wishlist.objects.count()}")
print(f"DemandForecasts:     {DemandForecast.objects.count()}")
print(f"Notifications:       {Notification.objects.count()}")

print("\n=== Order Status Breakdown ===")
for row in Order.objects.values("status").annotate(cnt=Count("id")).order_by("-cnt"):
    print(f"  {row['status']:22s}: {row['cnt']}")

print("\n=== Order Fulfillment Breakdown ===")
for row in Order.objects.values("fulfillment_option").annotate(cnt=Count("id")).order_by("-cnt"):
    print(f"  {row['fulfillment_option']:28s}: {row['cnt']}")

print("\n=== Top 5 Shops by Orders ===")
for row in Order.objects.values("shop__name").annotate(cnt=Count("id")).order_by("-cnt")[:5]:
    print(f"  {row['shop__name']:38s}: {row['cnt']} orders")

print("\n=== Revenue Summary ===")
rev = Order.objects.filter(status__in=["completed","delivered"]).aggregate(
    total=Sum("total_amount"), avg=Avg("total_amount"), cnt=Count("id"))
print(f"  Completed/Delivered orders : {rev['cnt']}")
print(f"  Total Revenue              : Rs. {rev['total'] or 0:.2f}")
print(f"  Avg Order Value            : Rs. {rev['avg'] or 0:.2f}")

print("\n=== Rider Summary ===")
for r in Rider.objects.all().order_by("-total_deliveries")[:5]:
    print(f"  {r.full_name:20s} | Deliveries: {r.total_deliveries:5d} | Rating: {r.rating} | Online: {r.is_online}")

print("\n=== Customer Segment Breakdown ===")
for row in Customer.objects.values("segment").annotate(cnt=Count("id")).order_by("-cnt"):
    print(f"  {row['segment']:25s}: {row['cnt']}")
