from rest_framework.response import Response
from rest_framework.views import APIView
from .recommendations import get_recommendations
from .trending import trending
from .ranking import score_products
from core.serializers import ProductSerializer


class RecommendationView(APIView):
    def get(self, request, user_id=None):
        recommendations = get_recommendations(user_id=user_id, limit=10)
        serializer = ProductSerializer(recommendations, many=True)
        return Response(serializer.data)



class TrendingView(APIView):
    def get(self, request):
        hours = int(request.query_params.get("hours", 24))
        limit = int(request.query_params.get("limit", 10))

        return Response(
            trending(hours=hours, limit=limit)
        )

class RankedView(APIView):
    def get(self, request):
        products = list(ProductSerializer.Meta.model.objects.all())
        ranked = score_products(products)
        serializer = ProductSerializer(ranked, many=True)
        return Response(serializer.data)
