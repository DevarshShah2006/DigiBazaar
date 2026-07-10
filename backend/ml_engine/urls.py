from django.urls import path
from .views import RecommendationView, TrendingView, RankedView

urlpatterns = [
    path('recommend/<int:user_id>/', RecommendationView.as_view(), name='recommendations'),
    path('recommend/popular/', RecommendationView.as_view(), name='recommendations_popular_legacy'),
    path('recommend/', RecommendationView.as_view(), name='recommendations_popular'),
    path('trending/', TrendingView.as_view(), name='trending'),
    path('ranked/', RankedView.as_view(), name='ranked'),
]

