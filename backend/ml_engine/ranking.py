import math
from django.db.models import Min
from .utils import normalize_scores
from core.models import Product, Shop


def score_products(products):
    scored = []
    for product in products:
        inventory_score = getattr(product, 'inventory', 0)
        popularity_score = getattr(product, 'order_count', 0)
        base_score = inventory_score * 0.4 + popularity_score * 0.6
        scored.append((product, base_score))

    scores = [score for _, score in scored]
    normalized = normalize_scores(scores)
    return [product for (product, _), score in sorted(zip(scored, normalized), key=lambda item: item[1], reverse=True)]


def haversine_distance(lat1, lon1, lat2, lon2):
    radius = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def distance_score(shop, user_lat=None, user_long=None, max_distance_km=50):
    if user_lat is None or user_long is None:
        return 0.5

    shop_lat = float(shop.lat)
    shop_long = float(shop.long)
    distance_km = haversine_distance(user_lat, user_long, shop_lat, shop_long)
    return max(0.0, 1 - min(distance_km, max_distance_km) / max_distance_km)


def price_score(shop, min_price, max_price):
    shop_price = float(getattr(shop, 'min_price', max_price or 0) or 0)
    if max_price <= min_price:
        return 0.5

    normalized = 1 - ((shop_price - min_price) / (max_price - min_price))
    return max(0.0, min(1.0, normalized))


def rating_score(shop):
    return max(0.0, min(float(getattr(shop, 'rating', 0) or 0) / 5.0, 1.0))


def tier_score(shop):
    return 1.0 if shop.tier == 'premium' else 0.7


def get_ranked_shops(user_lat=None, user_long=None, limit=10):
    shops = Shop.objects.annotate(min_price=Min('products__price'))
    prices = [float(shop.min_price) for shop in shops if shop.min_price is not None]
    min_price = min(prices) if prices else 0.0
    max_price = max(prices) if prices else 0.0
    ranked = []

    for shop in shops:
        score = (
            distance_score(shop, user_lat=user_lat, user_long=user_long) * 0.25
            + price_score(shop, min_price, max_price) * 0.25
            + rating_score(shop) * 0.25
            + tier_score(shop) * 0.25
        )
        ranked.append((shop, score))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return [shop for shop, _ in ranked[:limit]]


def rank_shops_for_product(product, user_lat=None, user_long=None):
    shops = Shop.objects.filter(products=product).annotate(min_price=Min('products__price'))
    if not shops.exists():
        return []

    prices = [float(shop.min_price) for shop in shops if shop.min_price is not None]
    min_price = min(prices) if prices else 0.0
    max_price = max(prices) if prices else 0.0

    ranked = []
    for shop in shops:
        score = (
            distance_score(shop, user_lat=user_lat, user_long=user_long) * 0.25
            + price_score(shop, min_price, max_price) * 0.25
            + rating_score(shop) * 0.25
            + tier_score(shop) * 0.25
        )
        ranked.append((shop, score))

    ranked.sort(key=lambda item: item[1], reverse=True)
    return [shop for shop, _ in ranked]
