from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Shop, Product, Order, OrderItem, ShopOwner, Wishlist, Rider, DeliveryAssignment
from .serializers import (
    ShopSerializer,
    ProductSerializer,
    OrderSerializer,
    UserSerializer,
    WishlistSerializer,
    RiderSerializer,
    DeliveryAssignmentSerializer,
)

from .permissions import IsAdminOrReadOnly, IsShopOwnerOrReadOnly
from ml_engine.ranking import get_ranked_shops, rank_shops_for_product, haversine_distance

User = get_user_model()


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        queryset = super().get_queryset()
        query = self.request.query_params.get('q')
        category = self.request.query_params.get('category')

        if query:
            queryset = queryset.filter(name__icontains=query)

        if category:
            queryset = queryset.filter(
                Q(category__name__iexact=category)
                | Q(category__slug__iexact=category)
            )

        return queryset.distinct().order_by('name')

    @action(detail=False, methods=['get'])
    def search(self, request):
        return self.list(request)


class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.select_related('owner', 'owner__user').prefetch_related(
        'categories',
        'products',
        'products__category',
    )
    serializer_class = ShopSerializer
    permission_classes = [IsShopOwnerOrReadOnly]

    def perform_create(self, serializer):
        owner_profile = getattr(self.request.user, 'shop_owner_profile', None)
        if owner_profile is None:
            owner_profile, _ = ShopOwner.objects.get_or_create(user=self.request.user)
        serializer.save(owner=owner_profile)


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        role = request.data.get('role', 'customer')
        phone = request.data.get('phone', '')
        
        serializer = UserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create profiles based on the role
        from .models import ShopOwner, Rider, UserProfile
        if role == 'shopowner':
            ShopOwner.objects.get_or_create(user=user, defaults={'phone': phone})
        elif role == 'rider':
            Rider.objects.get_or_create(
                user=user,
                defaults={
                    'phone': phone,
                    'vehicle_type': 'Motorcycle',
                    'vehicle_number': 'GJ-01-XX-9999'
                }
            )
        else:
            UserProfile.objects.get_or_create(user=user, defaults={'phone': phone})
            
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data,
            }
        )

# OTP Authentication Views
import random
from datetime import timedelta
from django.utils import timezone
from .models import PhoneOTP

class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = request.data.get('phone')
        if not phone:
            return Response({'detail': 'Phone number required'}, status=status.HTTP_400_BAD_REQUEST)
        otp = f"{random.randint(100000, 999999)}"
        expires_at = timezone.now() + timedelta(minutes=5)
        # Create or update OTP entry
        obj, created = PhoneOTP.objects.update_or_create(
            phone=phone,
            defaults={'otp': otp, 'expires_at': expires_at, 'created_at': timezone.now()}
        )
        # TODO: integrate with SMS provider (e.g., Twilio) to send OTP
        return Response({'phone': phone, 'otp': otp, 'expires_at': expires_at}, status=status.HTTP_200_OK)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        phone = request.data.get('phone')
        otp = request.data.get('otp')
        if not phone or not otp:
            return Response({'detail': 'Phone and OTP required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            otp_obj = PhoneOTP.objects.get(phone=phone)
        except PhoneOTP.DoesNotExist:
            return Response({'detail': 'OTP not found'}, status=status.HTTP_404_NOT_FOUND)
        if not otp_obj.is_valid() or otp_obj.otp != otp:
            return Response({'detail': 'Invalid or expired OTP'}, status=status.HTTP_400_BAD_REQUEST)
        # OTP valid - you may create or retrieve a user here. For now, just acknowledge.
        return Response({'detail': 'OTP verified successfully'}, status=status.HTTP_200_OK)


class TokenRefreshView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('refresh')
        try:
            refresh = RefreshToken(token)
            return Response({'access': str(refresh.access_token)})
        except TokenError:
            return Response({'detail': 'Invalid refresh token'}, status=status.HTTP_400_BAD_REQUEST)


class ProductListView(generics.ListAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


class ProductSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '')
        category = request.query_params.get('category')
        products = Product.objects.select_related('category').all()
        if query:
            products = products.filter(name__icontains=query)
        if category:
            products = products.filter(Q(category__name__iexact=category) | Q(category__slug__iexact=category))
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.AllowAny]


class ShopDetailView(generics.RetrieveAPIView):
    queryset = Shop.objects.prefetch_related('categories', 'products', 'products__category')
    serializer_class = ShopSerializer
    permission_classes = [permissions.AllowAny]


class ShopRankingView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        lat = request.query_params.get('lat')
        long = request.query_params.get('long')
        user_lat = float(lat) if lat is not None else None
        user_long = float(long) if long is not None else None
        shops = get_ranked_shops(user_lat=user_lat, user_long=user_long, limit=20)
        serializer = ShopSerializer(shops, many=True)
        return Response(serializer.data)


class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        items = request.data.get('items', [])
        if not isinstance(items, list):
            return Response({'detail': 'Items must be a list'}, status=status.HTTP_400_BAD_REQUEST)

        fulfillment_option = request.data.get('fulfillment_option', 'digibazaar_delivery')
        delivery_address = request.data.get('delivery_address', '')
        lat = request.data.get('lat')
        long_ = request.data.get('long')
        user_lat = float(lat) if lat is not None else 23.0125
        user_long = float(long_) if long_ is not None else 72.5575

        # Group items by shop using the ranking algorithm
        orders_by_shop = {}
        for item in items:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)
            requested_shop_id = item.get('shop_id')
            
            product = Product.objects.prefetch_related('shops').filter(pk=product_id).first()
            if not product:
                continue

            shop = None
            if requested_shop_id:
                shop = product.shops.filter(pk=requested_shop_id).first()

            if shop is None:
                first_shop = Shop.objects.first()
                if first_shop and first_shop.products.filter(pk=product.id).exists():
                    shop = first_shop
                else:
                    ranked_shops = rank_shops_for_product(product, user_lat=user_lat, user_long=user_long)
                    shop = ranked_shops[0] if ranked_shops else None

            if not shop:
                continue

            group = orders_by_shop.setdefault(shop.id, {'shop': shop, 'items': []})
            group['items'].append({'product': product, 'quantity': quantity})

        created_orders = []
        for group in orders_by_shop.values():
            shop = group['shop']
            
            # Calculate delivery charge
            distance_km = 1.0
            if shop.lat and shop.long:
                distance_km = haversine_distance(user_lat, user_long, float(shop.lat), float(shop.long))
                
            charge = 0.0
            if fulfillment_option == 'shop_delivery':
                charge = 25.0
            elif fulfillment_option == 'digibazaar_delivery':
                charge = max(20.0, 20.0 + (distance_km * 5.0))
            
            # Determine initial status
            # If live inventory is True, auto-advance to accepted.
            # Else start at pending (90-sec timer starts in frontend)
            initial_status = 'accepted' if shop.live_inventory else 'pending'
            
            order = Order.objects.create(
                user=request.user,
                shop=shop,
                status=initial_status,
                fulfillment_option=fulfillment_option,
                delivery_address=delivery_address,
                lat=user_lat,
                long=user_long,
                delivery_charge=charge
            )
            
            for item in group['items']:
                OrderItem.objects.create(
                    order=order,
                    product=item['product'],
                    quantity=item['quantity'],
                    price_at_order=item['product'].price,
                )
            
            # If digibazaar_delivery, assign a rider
            if fulfillment_option == 'digibazaar_delivery':
                # Find an online rider, or create a mockup online rider if none exists
                rider = Rider.objects.filter(is_online=True).first()
                if not rider:
                    # Create mock rider
                    mock_user, _ = User.objects.get_or_create(
                        username='user_9876543210',
                        defaults={'email': 'rider@digibazaar.in'}
                    )
                    mock_user.set_password('OTPVerified123!')
                    mock_user.save()
                    rider, _ = Rider.objects.get_or_create(
                        user=mock_user,
                        defaults={
                            'phone': '9876543210',
                            'is_online': True,
                            'vehicle_type': 'Motorcycle',
                            'vehicle_number': 'GJ-01-HA-9876',
                            'lat': user_lat + 0.005,
                            'long': user_long + 0.005
                        }
                    )
                    rider.is_online = True
                    rider.save()
                
                order.rider = rider
                order.save()
                
                # Create DeliveryAssignment
                DeliveryAssignment.objects.create(
                    order=order,
                    rider=rider,
                    status='assigned',
                    eta=int(5 + distance_km * 4)
                )
                
            created_orders.append(order)

        serializer = OrderSerializer(created_orders, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')


class ShopOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        owner = getattr(request.user, "shop_owner_profile", None)

        if owner is None:
            return Response(
                {"detail": "You are not registered as a shop owner."},
                status=status.HTTP_403_FORBIDDEN,
            )

        orders = (
            Order.objects
            .filter(shop__owner=owner)
            .select_related("shop", "user")
            .prefetch_related("items", "items__product")
            .order_by("-created_at")
        )

        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)


class AcceptOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            return Response({'detail': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
        
        owner = getattr(request.user, "shop_owner_profile", None)

        if owner is None or order.shop.owner != owner:
            return Response(
                {"detail": "You are not allowed to manage this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order.update_status("accepted")
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(OrderSerializer(order).data)


class RejectOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            return Response({'detail': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        owner = getattr(request.user, "shop_owner_profile", None)

        if owner is None or order.shop.owner != owner:
            return Response(
                {"detail": "You are not allowed to manage this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            order.update_status("rejected")
            
            # Re-routing logic to the next best shop
            items = list(order.items.all())
            if items:
                first_product = items[0].product
                ranked_shops = rank_shops_for_product(first_product, user_lat=order.lat, user_long=order.long)
                next_shops = [s for s in ranked_shops if s.id != order.shop.id]
                if next_shops:
                    next_shop = next_shops[0]
                    new_order = Order.objects.create(
                        user=order.user,
                        shop=next_shop,
                        status='accepted' if next_shop.live_inventory else 'pending',
                        fulfillment_option=order.fulfillment_option,
                        delivery_address=order.delivery_address,
                        lat=order.lat,
                        long=order.long,
                        delivery_charge=order.delivery_charge,
                        rider=order.rider
                    )
                    for item in items:
                        OrderItem.objects.create(
                            order=new_order,
                            product=item.product,
                            quantity=item.quantity,
                            price_at_order=item.price_at_order
                        )
                    # Point delivery assignment to new order
                    if order.rider:
                        assignment = DeliveryAssignment.objects.filter(order=order).first()
                        if assignment:
                            assignment.order = new_order
                            assignment.save()
                    return Response({
                        "detail": f"Order rejected. Rerouted to {next_shop.name}",
                        "rerouted": True,
                        "new_order": OrderSerializer(new_order).data
                    })
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(OrderSerializer(order).data)


class AdvanceOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        order = Order.objects.filter(pk=order_id).first()
        if not order:
            return Response({'detail': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        owner = getattr(request.user, "shop_owner_profile", None)

        if owner is None or order.shop.owner != owner:
            return Response(
                {"detail": "You are not allowed to manage this order."},
                status=status.HTTP_403_FORBIDDEN,
            )

        next_status = Order.NEXT_STATUS.get(order.status)
        if not next_status:
            return Response(
                {"detail": f"Order in '{order.status}' has no further stage to advance to."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order.update_status(next_status)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(OrderSerializer(order).data)


from django.db.models import Min, Sum, F
from django.db.models.functions import TruncDate

class ProductShopsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        lat = request.query_params.get('lat')
        long = request.query_params.get('long')
        user_lat = float(lat) if lat is not None else None
        user_long = float(long) if long is not None else None

        product = Product.objects.filter(pk=pk).first()
        if not product:
            return Response([])

        ranked_shops = rank_shops_for_product(product, user_lat=user_lat, user_long=user_long)
        serializer = ShopSerializer(ranked_shops, many=True)
        return Response(serializer.data)


class OrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        owner = getattr(user, 'shop_owner_profile', None)
        rider = getattr(user, 'rider_profile', None)
        qs = Order.objects.all()
        if owner and rider:
            return qs.filter(Q(user=user) | Q(shop__owner=owner) | Q(rider=rider))
        elif owner:
            return qs.filter(Q(user=user) | Q(shop__owner=owner))
        elif rider:
            return qs.filter(Q(user=user) | Q(rider=rider))
        return qs.filter(user=user)


class WishlistViewSet(viewsets.ModelViewSet):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related('product', 'product__category')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_wishlist(self, request):
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'detail': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        wishlist_item = Wishlist.objects.filter(user=request.user, product_id=product_id).first()
        if wishlist_item:
            wishlist_item.delete()
            return Response({'status': 'removed', 'is_wishlisted': False}, status=status.HTTP_200_OK)
        else:
            product = Product.objects.filter(pk=product_id).first()
            if not product:
                return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
            Wishlist.objects.create(user=request.user, product=product)
            return Response({'status': 'added', 'is_wishlisted': True}, status=status.HTTP_201_CREATED)


class ShopAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        owner = getattr(request.user, 'shop_owner_profile', None)
        if not owner:
            return Response({'detail': 'Not a shop owner'}, status=status.HTTP_403_FORBIDDEN)

        shop_orders = Order.objects.filter(shop__owner=owner)
        total_orders = shop_orders.count()

        revenue_data = OrderItem.objects.filter(
            order__shop__owner=owner,
            order__status='completed'
        ).aggregate(total=Sum(F('price_at_order') * F('quantity')))
        total_revenue = float(revenue_data['total'] or 0.0)

        status_counts = shop_orders.values('status').annotate(count=Count('id'))
        status_dict = {item['status']: item['count'] for item in status_counts}

        sales_over_time = OrderItem.objects.filter(
            order__shop__owner=owner,
            order__status='completed'
        ).annotate(
            date=TruncDate('order__created_at')
        ).values('date').annotate(
            revenue=Sum(F('price_at_order') * F('quantity'))
        ).order_by('date')

        sales_history = [
            {
                'date': item['date'].strftime('%Y-%m-%d') if item['date'] else '',
                'revenue': float(item['revenue'] or 0.0)
            }
            for item in sales_over_time
        ]

        top_products = OrderItem.objects.filter(
            order__shop__owner=owner,
            order__status='completed'
        ).values(
            'product__name'
        ).annotate(
            sold_count=Sum('quantity'),
            revenue=Sum(F('price_at_order') * F('quantity'))
        ).order_by('-sold_count')[:5]

        top_products_list = [
            {
                'product_name': item['product__name'],
                'sold_count': item['sold_count'],
                'revenue': float(item['revenue'] or 0.0)
            }
            for item in top_products
        ]

        return Response({
            'total_revenue': total_revenue,
            'total_orders': total_orders,
            'status_counts': status_dict,
            'sales_history': sales_history,
            'top_products': top_products_list
        })


class ShopProductsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        owner = getattr(request.user, "shop_owner_profile", None)
        if owner is None:
            return Response({"detail": "Not a shop owner"}, status=status.HTTP_403_FORBIDDEN)
        
        shop = Shop.objects.filter(owner=owner).first()
        if not shop:
            return Response({"detail": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
        
        products = shop.products.all()
        serializer = ProductSerializer(products, many=True)
        return Response({
            "shop_name": shop.name,
            "live_inventory": shop.live_inventory,
            "products": serializer.data
        })

    def post(self, request):
        owner = getattr(request.user, "shop_owner_profile", None)
        if owner is None:
            return Response({"detail": "Not a shop owner"}, status=status.HTTP_403_FORBIDDEN)
        
        shop = Shop.objects.filter(owner=owner).first()
        if not shop:
            return Response({"detail": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({"detail": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        product = Product.objects.filter(pk=product_id).first()
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
            
        shop.products.add(product)
        return Response({"status": "added", "product_id": product.id}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        owner = getattr(request.user, "shop_owner_profile", None)
        if owner is None:
            return Response({"detail": "Not a shop owner"}, status=status.HTTP_403_FORBIDDEN)
        
        shop = Shop.objects.filter(owner=owner).first()
        if not shop:
            return Response({"detail": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({"detail": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        product = Product.objects.filter(pk=product_id).first()
        if not product:
            return Response({"detail": "Product not found"}, status=status.HTTP_404_NOT_FOUND)
            
        shop.products.remove(product)
        return Response({"status": "removed", "product_id": product.id}, status=status.HTTP_200_OK)


class ShopToggleLiveInventoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        owner = getattr(request.user, "shop_owner_profile", None)
        if owner is None:
            return Response({"detail": "Not a shop owner"}, status=status.HTTP_403_FORBIDDEN)
        
        shop = Shop.objects.filter(owner=owner).first()
        if not shop:
            return Response({"detail": "Shop not found"}, status=status.HTTP_404_NOT_FOUND)
            
        shop.live_inventory = not shop.live_inventory
        shop.save()
        return Response({"live_inventory": shop.live_inventory, "shop_name": shop.name})


class RiderStatusToggleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rider_profile = getattr(request.user, "rider_profile", None)
        if rider_profile is None:
            # Auto-create rider profile for testing
            rider_profile, _ = Rider.objects.get_or_create(
                user=request.user,
                defaults={'phone': '9999999999', 'vehicle_type': 'Bicycle', 'vehicle_number': 'BIKE-123'}
            )
        
        rider_profile.is_online = not rider_profile.is_online
        rider_profile.save()
        return Response({"is_online": rider_profile.is_online})


class RiderDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rider_profile = getattr(request.user, "rider_profile", None)
        if rider_profile is None:
            return Response({"detail": "Not registered as a rider"}, status=status.HTTP_403_FORBIDDEN)
        
        assignments = DeliveryAssignment.objects.filter(
            rider=rider_profile
        ).exclude(status='delivered').exclude(status='cancelled').order_by('-assigned_at')
        
        completed_assignments = DeliveryAssignment.objects.filter(
            rider=rider_profile,
            status='delivered'
        )
        total_earnings = completed_assignments.count() * 45.0
        
        assignment_serializer = DeliveryAssignmentSerializer(assignments, many=True)
        
        return Response({
            "is_online": rider_profile.is_online,
            "rating": float(rider_profile.rating),
            "completed_deliveries": completed_assignments.count(),
            "total_earnings": total_earnings,
            "vehicle_type": rider_profile.vehicle_type,
            "vehicle_number": rider_profile.vehicle_number,
            "active_assignments": assignment_serializer.data
        })


class UpdateDeliveryAssignmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        rider_profile = getattr(request.user, "rider_profile", None)
        if rider_profile is None:
            return Response({"detail": "Not a rider"}, status=status.HTTP_403_FORBIDDEN)
            
        assignment_id = request.data.get('assignment_id')
        new_status = request.data.get('status')
        
        assignment = DeliveryAssignment.objects.filter(pk=assignment_id, rider=rider_profile).first()
        if not assignment:
            return Response({"detail": "Assignment not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if new_status not in ['picked_up', 'delivered']:
            return Response({"detail": "Invalid status update"}, status=status.HTTP_400_BAD_REQUEST)
            
        assignment.status = new_status
        assignment.save()
        
        order = assignment.order
        if new_status == 'picked_up':
            order.status = 'picked_up'
        elif new_status == 'delivered':
            order.status = 'delivered'
        order.save()
        
        return Response(DeliveryAssignmentSerializer(assignment).data)

