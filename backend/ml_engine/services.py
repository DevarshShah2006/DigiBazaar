from collections import defaultdict
from math import sqrt
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from core.models import Product, Order, OrderItem

User = get_user_model()


def build_matrix():
    users = list(User.objects.filter(orders__isnull=False).distinct())
    products = list(Product.objects.filter(order_items__isnull=False).distinct())
    user_index = {user.id: idx for idx, user in enumerate(users)}
    product_index = {product.id: idx for idx, product in enumerate(products)}
    matrix = [[0.0 for _ in products] for _ in users]

    for item in OrderItem.objects.select_related('order', 'product').all():
        user_id = item.order.user_id
        product_id = item.product_id
        if user_id in user_index and product_id in product_index:
            matrix[user_index[user_id]][product_index[product_id]] += item.quantity

    return users, products, matrix, user_index, product_index


def cosine_similarity(vector_a, vector_b):
    dot = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = sqrt(sum(a * a for a in vector_a))
    norm_b = sqrt(sum(b * b for b in vector_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


class RecommendationService:
    def recommend(self, user_id=None, limit=10):
        if user_id:
            recent_orders = (
                Order.objects.filter(user_id=user_id)
                .order_by('-ordered_at')
                .select_related('product__shop')[:5]
            )
            if recent_orders.exists():
                shop_ids = {order.product.shop_id for order in recent_orders}
                recommendations = (
                    Product.objects.filter(shop_id__in=shop_ids)
                    .exclude(orders__user_id=user_id)
                    .annotate(order_count=Count('orders'))
                    .order_by('-order_count', '-created_at')
                )
                return recommendations[:limit]

        popular_products = (
            Product.objects.annotate(order_count=Count('orders'))
            .order_by('-order_count', '-created_at')
        )
        return popular_products[:limit]

    def recommend_for_user(self, user, limit=10):
        users, products, matrix, user_index, _ = build_matrix()
        if user.id not in user_index:
            return self.recommend(user_id=user.id, limit=limit)

        target_row = matrix[user_index[user.id]]
        similarities = []
        for other_idx, other_user in enumerate(users):
            if other_user.id == user.id:
                continue
            sim = cosine_similarity(target_row, matrix[other_idx])
            if sim > 0:
                similarities.append((other_idx, sim))

        if not similarities:
            return self.recommend(user_id=user.id, limit=limit)

        weighted_scores = [0.0] * len(products)
        for other_idx, similarity in similarities:
            for product_idx, qty in enumerate(matrix[other_idx]):
                weighted_scores[product_idx] += similarity * qty

        for product_idx, qty in enumerate(target_row):
            if qty > 0:
                weighted_scores[product_idx] = 0.0

        ranked = sorted(
            [(products[idx], score) for idx, score in enumerate(weighted_scores) if score > 0],
            key=lambda item: item[1],
            reverse=True,
        )

        if not ranked:
            return self.recommend(user_id=user.id, limit=limit)

        return [product for product, _ in ranked[:limit]]
