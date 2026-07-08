from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,
    ShopViewSet,
    SignupView,
    LoginView,
    TokenRefreshView,
    ProductListView,
    ProductSearchView,
    ProductDetailView,
    ShopDetailView,
    ShopRankingView,
    CheckoutView,
    MyOrdersView,
    ShopOrdersView,
    AcceptOrderView,
    RejectOrderView,
    ProductShopsView,
    OrderDetailView,
    WishlistViewSet,
    ShopAnalyticsView,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = [
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('products/list/', ProductListView.as_view(), name='product_list'),
    path('products/search/', ProductSearchView.as_view(), name='product_search'),
    path('products/detail/<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('products/<int:pk>/shops/', ProductShopsView.as_view(), name='product_shops'),
    path('shops/detail/<int:pk>/', ShopDetailView.as_view(), name='shop_detail'),
    path('shops/ranking/', ShopRankingView.as_view(), name='shop_ranking'),
    path('shops/analytics/', ShopAnalyticsView.as_view(), name='shop_analytics'),
    path('orders/checkout/', CheckoutView.as_view(), name='checkout'),
    path('orders/my-orders/', MyOrdersView.as_view(), name='my_orders'),
    path('orders/shop-orders/', ShopOrdersView.as_view(), name='shop_orders'),
    path('orders/accept/', AcceptOrderView.as_view(), name='accept_order'),
    path('orders/reject/', RejectOrderView.as_view(), name='reject_order'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
    path('', include(router.urls)),
]

