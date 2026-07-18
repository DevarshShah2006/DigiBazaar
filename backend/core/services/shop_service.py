"""
ShopService — shop profile and settings management.
"""

from core.models import Shop
from ml_engine.ranking import haversine_distance


class ShopService:
    """Shop management logic."""

    @staticmethod
    def get_owner_shop(owner):
        """Get the primary shop for an owner."""
        return Shop.objects.filter(owner=owner).first()

    @staticmethod
    def update_location(shop, lat, long, address=""):
        shop.lat = lat
        shop.long = long
        if address:
            shop.address = address
        shop.save(update_fields=["lat", "long", "address", "updated_at"])
        return shop

    @staticmethod
    def toggle_open_status(shop):
        shop.is_open = not shop.is_open
        shop.save(update_fields=["is_open", "updated_at"])
        return shop

    @staticmethod
    def toggle_live_inventory(shop):
        shop.live_inventory = not shop.live_inventory
        shop.save(update_fields=["live_inventory", "updated_at"])
        return shop

    @staticmethod
    def get_nearby_shops(lat, long, radius_km=5, limit=20):
        """Filter shops within radius using Haversine (backend, free)."""
        all_shops = Shop.objects.filter(is_open=True)
        nearby = []
        for shop in all_shops:
            dist = haversine_distance(
                float(lat), float(long),
                float(shop.lat), float(shop.long),
            )
            if dist <= radius_km:
                nearby.append({
                    "shop": shop,
                    "distance_km": round(dist, 2),
                    "estimated_delivery_time": f"{int(5 + dist * 4)} mins",
                    "is_deliverable": dist <= float(shop.delivery_radius_km),
                })
        nearby.sort(key=lambda x: x["distance_km"])
        return nearby[:limit]

    @staticmethod
    def get_delivery_info(shop, customer_lat, customer_long):
        """Calculate delivery info for a specific shop."""
        distance = haversine_distance(
            float(customer_lat), float(customer_long),
            float(shop.lat), float(shop.long),
        )
        is_deliverable = distance <= float(shop.delivery_radius_km)
        eta = int(5 + distance * 4) if is_deliverable else None

        return {
            "distance_km": round(distance, 2),
            "estimated_delivery_time": f"{eta} mins" if eta else None,
            "is_deliverable": is_deliverable,
            "pickup_enabled": shop.pickup_enabled,
            "self_delivery": shop.self_delivery_enabled,
            "digibazaar_delivery": shop.digibazaar_delivery_enabled,
            "delivery_charge": float(shop.delivery_charge_flat) if is_deliverable else None,
            "free_delivery_above": float(shop.free_delivery_above),
        }
