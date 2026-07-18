import urllib.request
import json
import random
from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum, F, Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Shop, Order, OrderItem, Inventory, Product

# Open-Meteo Weather Codes Mapping
WEATHER_CODES = {
    0: "Sunny",
    1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow",
    77: "Snow Grains",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    85: "Slight Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Slight Hail", 99: "Thunderstorm with Heavy Hail"
}

def get_shop_for_owner(user):
    owner = getattr(user, 'shop_owner_profile', None)
    if not owner:
        return None
    return Shop.objects.filter(owner=owner).first()


class ShopRevenueTodayView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner or shop not found'}, status=status.HTTP_403_FORBIDDEN)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)

        # Revenue Today (Completed / Delivered)
        today_rev = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered'],
            order__created_at__gte=today_start
        ).aggregate(total=Sum(F('price_at_order') * F('quantity')))['total'] or 0.0

        # Revenue Yesterday
        yesterday_rev = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered'],
            order__created_at__range=(yesterday_start, today_start)
        ).aggregate(total=Sum(F('price_at_order') * F('quantity')))['total'] or 0.0

        today_rev = float(today_rev)
        yesterday_rev = float(yesterday_rev)

        # Calculate percentage change
        pct_change = 0.0
        status_val = "up"
        if yesterday_rev > 0:
            pct_change = round(((today_rev - yesterday_rev) / yesterday_rev) * 100, 1)
            status_val = "up" if pct_change >= 0 else "down"
            pct_change = abs(pct_change)
        else:
            pct_change = 100.0 if today_rev > 0 else 0.0
            status_val = "up"

        return Response({
            'revenue_today': today_rev,
            'yesterday_revenue': yesterday_rev,
            'percentage_change': pct_change,
            'status': status_val
        })


class ShopRevenueMonthView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now()
        this_month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Last month start and end dates
        last_month_end = this_month_start - timedelta(seconds=1)
        last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Revenue This Month
        this_month_rev = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered'],
            order__created_at__gte=this_month_start
        ).aggregate(total=Sum(F('price_at_order') * F('quantity')))['total'] or 0.0

        # Revenue Last Month
        last_month_rev = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered'],
            order__created_at__range=(last_month_start, this_month_start)
        ).aggregate(total=Sum(F('price_at_order') * F('quantity')))['total'] or 0.0

        this_month_rev = float(this_month_rev)
        last_month_rev = float(last_month_rev)

        pct_change = 0.0
        status_val = "up"
        if last_month_rev > 0:
            pct_change = round(((this_month_rev - last_month_rev) / last_month_rev) * 100, 1)
            status_val = "up" if pct_change >= 0 else "down"
            pct_change = abs(pct_change)
        else:
            pct_change = 100.0 if this_month_rev > 0 else 0.0
            status_val = "up"

        return Response({
            'revenue_month': this_month_rev,
            'last_month_revenue': last_month_rev,
            'percentage_change': pct_change,
            'status': status_val
        })


class ShopTopProductsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        top_products = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered']
        ).values('product__name').annotate(
            sold_count=Sum('quantity'),
            revenue=Sum(F('price_at_order') * F('quantity'))
        ).order_by('-sold_count')[:5]

        products_list = [
            {
                'product_name': item['product__name'],
                'sold_count': item['sold_count'],
                'revenue': float(item['revenue'] or 0.0)
            }
            for item in top_products
        ]

        # If empty, default to listing shop inventory products with 0 sales
        if not products_list:
            for p in shop.products.all()[:5]:
                products_list.append({
                    'product_name': p.name,
                    'sold_count': 0,
                    'revenue': 0.0
                })

        return Response(products_list)


class MarketSearchTrendsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Deterministic simulation of Google Trends based on the day
        today_val = date.today().toordinal()
        rng = random.Random(today_val)
        
        keywords = ["Milk", "Butter", "Ice Cream", "Cold Drink", "Rice", "Cooking Oil", "Eggs"]
        trends = []
        for kw in keywords:
            base_score = 65
            if kw == "Ice Cream" or kw == "Cold Drink":
                base_score = 80 if date.today().month in [4, 5, 6, 7, 8] else 50
            elif kw == "Milk" or kw == "Eggs":
                base_score = 75
            
            score = base_score + rng.randint(-10, 15)
            score = max(10, min(100, score))
            trends.append({
                "keyword": kw,
                "trend_score": score
            })
            
        trends.sort(key=lambda x: x['trend_score'], reverse=True)
        return Response(trends[:5])


class ShopLowStockView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        # min_stock is set to 5 by default in model
        low_stock = Inventory.objects.filter(
            shop=shop,
            current_stock__gt=0,
            current_stock__lt=F('min_stock')
        ).select_related('product')[:5]

        items = [
            {
                'product_id': item.product.id,
                'product_name': item.product.name,
                'remaining': item.current_stock
            }
            for item in low_stock
        ]
        return Response(items)


class ShopOutOfStockView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        out_of_stock = Inventory.objects.filter(
            shop=shop,
            current_stock=0
        ).select_related('product')[:5]

        items = [
            {
                'product_id': item.product.id,
                'product_name': item.product.name
            }
            for item in out_of_stock
        ]
        return Response(items)


class ShopExpiringProductsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        today_dt = timezone.now().date()
        limit_dt = today_dt + timedelta(days=7)

        expiring = Inventory.objects.filter(
            shop=shop,
            expiry_date__isnull=False,
            expiry_date__range=(today_dt, limit_dt),
            current_stock__gt=0
        ).select_related('product').order_by('expiry_date')[:5]

        items = []
        for item in expiring:
            days = (item.expiry_date - today_dt).days
            if days == 0:
                # Expiring today, calculate hours left
                now = timezone.now()
                end_of_day = now.replace(hour=23, minute=59, second=59)
                hours_left = max(1, int((end_of_day - now).total_seconds() / 3600))
                remaining = f"{hours_left} Hours Remaining"
            elif days == 1:
                remaining = "1 Day Remaining"
            else:
                remaining = f"{days} Days Remaining"

            items.append({
                'product_name': item.product.name,
                'remaining': remaining
            })

        return Response(items)


class ShopSlowMovingProductsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        shop = get_shop_for_owner(request.user)
        if not shop:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        # A product is slow moving if:
        # 1. It is in inventory with high stock (>= 10 units)
        # 2. Sales in the last 30 days are very low (< 3 units sold)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # Calculate sales per product in last 30 days
        sales = OrderItem.objects.filter(
            order__shop=shop,
            order__status__in=['completed', 'delivered'],
            order__created_at__gte=thirty_days_ago
        ).values('product_id').annotate(sold=Sum('quantity'))
        
        sales_dict = {item['product_id']: item['sold'] for item in sales}

        # Check inventory
        inventory = Inventory.objects.filter(
            shop=shop,
            current_stock__gte=10
        ).select_related('product')

        slow_moving = []
        for item in inventory:
            sold = sales_dict.get(item.product.id, 0)
            if sold < 3:
                # Suggest a marketing action based on the product type or stock
                if item.current_stock >= 50:
                    rec = "Create 20% Discount"
                elif sold == 0:
                    rec = "Bundle Offer with bestseller"
                else:
                    rec = "Highlight in Featured items"

                slow_moving.append({
                    'product_name': item.product.name,
                    'sold_count': sold,
                    'current_stock': item.current_stock,
                    'recommendation': rec
                })

        return Response(slow_moving[:5])


class ShopWeatherView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Ahmedabad coordinates
        lat, lon = "23.0225", "72.5714"
        weather_api_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"

        # Safe defaults
        default_weather = {
            "temp": 32.5,
            "condition": "Sunny",
            "is_raining": False
        }

        try:
            req = urllib.request.Request(
                weather_api_url, 
                headers={'User-Agent': 'Mozilla/5.0 (DigiBazaar/1.0)'}
            )
            with urllib.request.urlopen(req, timeout=3) as response:
                data = json.loads(response.read().decode())
                current = data.get("current_weather", {})
                temp = current.get("temperature", 32.5)
                code = current.get("weathercode", 0)
                condition = WEATHER_CODES.get(code, "Sunny")
                is_raining = code in [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]

                return Response({
                    "temp": float(temp),
                    "condition": condition,
                    "is_raining": is_raining,
                    "city": "Ahmedabad"
                })
        except Exception as e:
            # Fallback to simulated offline weather
            return Response({
                "temp": default_weather["temp"],
                "condition": default_weather["condition"],
                "is_raining": default_weather["is_raining"],
                "city": "Ahmedabad (Offline)"
            })
