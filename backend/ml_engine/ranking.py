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


def score_shop(shop, user_lat=None, user_long=None):
    # Calculate distance
    distance_km = 0.5
    if user_lat is not None and user_long is not None:
        shop_lat = float(shop.lat)
        shop_long = float(shop.long)
        distance_km = haversine_distance(user_lat, user_long, shop_lat, shop_long)
    
    # ETA Calculation
    # transit time = distance / 15 km/h * 60 mins = distance * 4 mins
    transit_time = distance_km * 4.0
    prep_time = 5.0 if shop.live_inventory else 15.0
    eta = prep_time + transit_time
    
    # Normalized scores
    s_eta = max(0.0, 1 - eta / 60.0)
    s_dist = max(0.0, 1 - distance_km / 15.0)
    s_rating = float(shop.rating or 0.0) / 5.0
    s_rating = max(0.0, min(1.0, s_rating))
    
    # Inventory reliability
    s_inv = float(shop.reliability_score or 1.0) - float(shop.cancellation_rate or 0.0)
    s_inv = max(0.0, min(1.0, s_inv))
    
    # Premium boost
    s_premium = 1.0 if shop.tier == 'premium' else 0.0
    
    # Formula: 50% ETA, 20% distance, 15% rating, 10% inventory, 5% premium
    final_score = (
        0.50 * s_eta +
        0.20 * s_dist +
        0.15 * s_rating +
        0.10 * s_inv +
        0.05 * s_premium
    )
    
    return final_score, eta


def get_ranked_shops(user_lat=None, user_long=None, limit=10):
    shops = list(Shop.objects.all())
    if not shops:
        return []

    # 1. Compute ETA for all shops to find min ETA
    shop_etas = []
    for shop in shops:
        _, eta = score_shop(shop, user_lat=user_lat, user_long=user_long)
        shop_etas.append((shop, eta))
    
    min_eta = min(eta for _, eta in shop_etas) if shop_etas else 0.0

    # 2. Score and check Fairness Window
    scored_shops = []
    for shop, eta in shop_etas:
        score, _ = score_shop(shop, user_lat=user_lat, user_long=user_long)
        # If outside fairness window (more than 15 mins slower than min_eta), apply penalty
        if eta > min_eta + 15.0:
            score -= 10.0
        scored_shops.append((shop, score))
    
    # Sort by score descending
    scored_shops.sort(key=lambda item: item[1], reverse=True)
    return [shop for shop, _ in scored_shops[:limit]]


def rank_shops_for_product(product, user_lat=None, user_long=None):
    shops = list(Shop.objects.filter(products=product))
    if not shops:
        return []

    # 1. Compute ETA to find min ETA
    shop_etas = []
    for shop in shops:
        _, eta = score_shop(shop, user_lat=user_lat, user_long=user_long)
        shop_etas.append((shop, eta))

    min_eta = min(eta for _, eta in shop_etas) if shop_etas else 0.0

    # 2. Score and check Fairness Window
    scored_shops = []
    for shop, eta in shop_etas:
        score, _ = score_shop(shop, user_lat=user_lat, user_long=user_long)
        if eta > min_eta + 15.0:
            score -= 10.0
        scored_shops.append((shop, score))

    scored_shops.sort(key=lambda item: item[1], reverse=True)
    return [shop for shop, _ in scored_shops]
