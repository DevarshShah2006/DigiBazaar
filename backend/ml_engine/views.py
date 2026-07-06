from rest_framework.response import Response
from rest_framework.views import APIView
from .recommendations import get_recommendations
from .trending import trending_products
from .ranking import score_products
from core.serializers import ProductSerializer


class RecommendationView(APIView):
    def get(self, request, user_id):
        recommendations = get_recommendations(user_id=user_id, limit=10)
        serializer = ProductSerializer(recommendations, many=True)
        return Response(serializer.data)


class TrendingView(APIView):
    def get(self, request):
        trending = trending_products(limit=10)
        serializer = ProductSerializer(trending, many=True)
        return Response(serializer.data)


class RankedView(APIView):
    def get(self, request):
        products = list(ProductSerializer.Meta.model.objects.all())
        ranked = score_products(products)
        serializer = ProductSerializer(ranked, many=True)
        return Response(serializer.data)
