"""
OrderService — all order business logic.

Views call this service; the service owns transitions,
rerouting, cancellation, and financial calculations.
"""

from decimal import Decimal
from django.utils import timezone

from core.models import (
    Order, OrderItem, Shop, Product, Rider,
    DeliveryAssignment, Inventory, InventoryLog,
)
from ml_engine.ranking import rank_shops_for_product, haversine_distance
from ml_engine.delivery_predictor import delivery_predictor


class OrderService:
    """Business logic for order lifecycle."""

    @staticmethod
    def calculate_delivery_charge(shop, user_lat, user_long, fulfillment_option):
        distance_km = 1.0
        if shop.lat and shop.long and user_lat and user_long:
            distance_km = haversine_distance(
                float(user_lat), float(user_long),
                float(shop.lat), float(shop.long),
            )

        if fulfillment_option == "pickup":
            return Decimal("0.00"), distance_km
        elif fulfillment_option == "shop_delivery":
            charge = shop.delivery_charge_flat
            return charge, distance_km
        else:  # digibazaar_delivery
            charge = max(
                Decimal("20.00"),
                Decimal("20.00") + Decimal(str(round(distance_km * 5.0, 2))),
            )
            return charge, distance_km

    @staticmethod
    def calculate_order_totals(items_data, delivery_charge, discount=Decimal("0")):
        """Calculate subtotal, tax, and total from item data."""
        subtotal = sum(
            item["price"] * item["quantity"] for item in items_data
        )
        tax = subtotal * Decimal("0.05")  # Simplified 5% tax
        total = subtotal + delivery_charge + tax - discount
        return {
            "subtotal": subtotal,
            "tax_amount": tax,
            "total_amount": max(total, Decimal("0")),
        }

    @staticmethod
    def attach_ml_recommendation(order, user_lat=None, user_long=None):
        """Calculates features, predicts delivery mode, and saves to order."""
        try:
            shop = order.shop
            distance_km = 0.0
            if shop.lat and shop.long and user_lat and user_long:
                distance_km = haversine_distance(
                    float(user_lat), float(user_long),
                    float(shop.lat), float(shop.long)
                )

            # Rider availability proxy (in real app, count online riders in zone)
            available_riders = Rider.objects.filter(is_online=True).count()
            if available_riders < 2:
                rider_availability = "Low"
            elif available_riders < 10:
                rider_availability = "Medium"
            else:
                rider_availability = "High"

            pending_orders = Order.objects.filter(
                shop=shop, 
                status__in=['pending', 'accepted', 'preparing', 'ready_for_pickup']
            ).count()

            features = {
                "distance_km": float(distance_km),
                "order_value": float(order.total_amount),
                "rider_availability": rider_availability,
                "shop_delivery_enabled": 1 if shop.self_delivery_enabled else 0,
                "pickup_enabled": 1 if shop.pickup_enabled else 0,
                "digibazaar_delivery_enabled": 1 if shop.digibazaar_delivery_enabled else 0,
                "shop_rating": float(shop.rating or 4.0),
                "avg_prep_time_mins": int(shop.avg_preparation_time_mins or 15),
                "current_pending_orders": pending_orders,
                "shop_delivery_radius_km": float(shop.delivery_radius_km or 5.0)
            }

            predicted_mode, confidence = delivery_predictor.predict(features)
            
            if predicted_mode:
                order.recommended_delivery_mode = predicted_mode
                order.delivery_mode_confidence = Decimal(str(confidence))
                order.save(update_fields=["recommended_delivery_mode", "delivery_mode_confidence"])
                
        except Exception as e:
            print(f"ML Recommendation failed to attach: {e}")

        return order

    @staticmethod
    def accept_order(order, owner):
        """Accept a pending order."""
        if order.shop.owner != owner:
            raise PermissionError("Not authorized")
        order.update_status("accepted")
        return order

    @staticmethod
    def reject_order(order, owner):
        """Reject and attempt reroute to next-best shop."""
        if order.shop.owner != owner:
            raise PermissionError("Not authorized")

        order.update_status("rejected")
        order.cancellation_reason = "shop_rejected"
        order.save(update_fields=["cancellation_reason"])

        # Reroute logic
        items = list(order.items.all())
        if not items:
            return order, None

        first_product = items[0].product
        ranked_shops = rank_shops_for_product(
            first_product, user_lat=order.lat, user_long=order.long,
        )
        next_shops = [s for s in ranked_shops if s.id != order.shop_id]
        if not next_shops:
            return order, None

        next_shop = next_shops[0]
        new_order = Order.objects.create(
            user=order.user,
            shop=next_shop,
            status="accepted" if next_shop.live_inventory else "pending",
            fulfillment_option=order.fulfillment_option,
            delivery_address=order.delivery_address,
            lat=order.lat,
            long=order.long,
            delivery_charge=order.delivery_charge,
            rider=order.rider,
            payment_method=order.payment_method,
            customer_notes=order.customer_notes,
        )
        for item in items:
            OrderItem.objects.create(
                order=new_order,
                product=item.product,
                quantity=item.quantity,
                price_at_order=item.price_at_order,
            )

        # Move delivery assignment
        if order.rider:
            assignment = DeliveryAssignment.objects.filter(order=order).first()
            if assignment:
                assignment.order = new_order
                assignment.save()

        order.replacement_order = new_order
        order.save(update_fields=["replacement_order"])

        return order, new_order

    @staticmethod
    def advance_order(order, owner):
        """Advance to the next logical status."""
        if order.shop.owner != owner:
            raise PermissionError("Not authorized")

        next_status = Order.NEXT_STATUS.get(order.status)
        if not next_status:
            raise ValueError(
                f"Order in '{order.status}' has no further stage."
            )
        order.update_status(next_status)
        return order

    @staticmethod
    def cancel_order(order, reason="customer_request"):
        """Cancel an order and handle refund tracking."""
        if order.status in ("completed", "cancelled", "rejected"):
            raise ValueError(f"Cannot cancel order in '{order.status}'")

        order.update_status("cancelled")
        order.cancellation_reason = reason
        if order.payment_status == "paid":
            order.refund_status = "pending"
            order.refund_amount = order.total_amount
        order.save()
        return order

    @staticmethod
    def assign_rider(order, user_lat=None, user_long=None):
        """Find and assign an available rider."""
        rider = Rider.objects.filter(is_online=True).first()
        if not rider:
            return None

        order.rider = rider
        order.save(update_fields=["rider"])

        distance_km = 0
        if order.shop.lat and order.shop.long and user_lat and user_long:
            distance_km = haversine_distance(
                float(user_lat), float(user_long),
                float(order.shop.lat), float(order.shop.long),
            )

        DeliveryAssignment.objects.create(
            order=order,
            rider=rider,
            status="assigned",
            eta=int(5 + distance_km * 4),
            distance_km=Decimal(str(round(distance_km, 2))),
        )
        return rider
