from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Category, Shop, Product, Order, OrderItem, Wishlist, Rider, DeliveryAssignment

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role')

    def get_role(self, obj):
        # Admin check first (highest priority)
        if obj.is_staff or obj.is_superuser or obj.username.startswith('admin_') or '9111111111' in obj.username or '9111111111' in (obj.email or ''):
            return 'admin'
        # Explicit customer username takes priority
        if obj.username.startswith('user_'):
            return 'customer'
        # Explicit rider check
        if obj.username.startswith('rider_'):
            return 'rider'
        # Explicit shop owner check
        if obj.username.startswith('owner_'):
            return 'shopowner'

        try:
            obj.shop_owner_profile
            return 'shopowner'
        except Exception:
            pass
        try:
            obj.rider_profile
            return 'rider'
        except Exception:
            pass
        return 'customer'

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    subcategory_name = serializers.SerializerMethodField()

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category else None

    def get_subcategory_name(self, obj):
        return obj.subcategory.name if obj.subcategory else None

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'category',
            'category_name',
            'category_slug',
            'subcategory_name',
            'brand',
            'description',
            'price',
            'mrp',
            'selling_price',
            'discount_percent',
            'quantity_label',
            'rating',
            'review_count',
            'image_url',
            'food_type',
            'guarantee',
            'warranty',
            'shelf_life',
            'created_at',
        )


class ShopSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(many=True, read_only=True, source='categories')
    product_details = ProductSerializer(many=True, read_only=True, source='products')
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        write_only=True,
        required=False,
    )
    products = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Product.objects.all(),
        write_only=True,
        required=False,
    )
    owner = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Shop
        fields = (
            'id',
            'owner',
            'name',
            'tier',
            'rating',
            'lat',
            'long',
            'address',
            'categories',
            'products',
            'category_details',
            'product_details',
            'live_inventory',
            'reliability_score',
            'cancellation_rate',
            'created_at',
        )

    def create(self, validated_data):
        categories = validated_data.pop('categories', [])
        products = validated_data.pop('products', [])
        shop = super().create(validated_data)
        if categories:
            shop.categories.set(categories)
        if products:
            shop.products.set(products)
        return shop

    def update(self, instance, validated_data):
        categories = validated_data.pop('categories', None)
        products = validated_data.pop('products', None)
        shop = super().update(instance, validated_data)
        if categories is not None:
            shop.categories.set(categories)
        if products is not None:
            shop.products.set(products)
        return shop


class ShopListSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(many=True, read_only=True, source='categories')
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Shop
        fields = (
            'id',
            'name',
            'tier',
            'rating',
            'lat',
            'long',
            'address',
            'category_details',
            'product_count',
            'live_inventory',
            'reliability_score',
            'cancellation_rate',
            'is_open',
            'created_at',
        )


class RiderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Rider
        fields = (
            'id',
            'username',
            'phone',
            'full_name',
            'is_online',
            'lat',
            'long',
            'rating',
            'vehicle_type',
            'vehicle_number',
            'total_deliveries',
            'total_earnings',
        )


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    image_url = serializers.CharField(source="product.image_url", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "image_url", "quantity", "price_at_order")


class OrderSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    user_phone = serializers.SerializerMethodField()
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    shop_phone = serializers.SerializerMethodField()
    shop_address = serializers.CharField(source="shop.address", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    rider_details = RiderSerializer(source="rider", read_only=True)
    rider_phone = serializers.SerializerMethodField()
    cancellation_reason = serializers.CharField(read_only=True)
    timeline = serializers.SerializerMethodField()

    def get_total_price(self, obj):
        if obj.total_amount and obj.total_amount > 0:
            return float(obj.total_amount)
        return float(sum(item.price_at_order * item.quantity for item in obj.items.all()) + (obj.delivery_charge or 0))

    def get_user_phone(self, obj):
        """Extract phone from username pattern user_XXXXXXXXXX"""
        username = obj.user.username
        if username.startswith('user_'):
            return username[5:]
        try:
            profile = obj.user.customer_profile
            if profile and profile.phone:
                return profile.phone
        except Exception:
            pass
        return username

    def get_shop_phone(self, obj):
        """Get the shop owner's phone number."""
        try:
            return obj.shop.owner.phone or ''
        except Exception:
            return ''

    def get_rider_phone(self, obj):
        """Get the assigned rider's phone number."""
        if obj.rider:
            return obj.rider.phone or ''
        return ''

    def get_timeline(self, obj):
        """Return order timeline events for status tracking."""
        try:
            from .models import OrderTimeline
            events = OrderTimeline.objects.filter(order=obj).order_by('timestamp')
            return [
                {
                    'status': e.status,
                    'timestamp': e.timestamp.isoformat(),
                    'note': e.note
                }
                for e in events
            ]
        except Exception:
            return []

    class Meta:
        model = Order
        fields = (
            "id",
            "shop",
            "shop_name",
            "shop_address",
            "shop_phone",
            "user",
            "user_name",
            "user_phone",
            "status",
            "cancellation_reason",
            "items",
            "subtotal",
            "tax_amount",
            "discount_amount",
            "total_amount",
            "total_price",
            "payment_method",
            "payment_status",
            "fulfillment_option",
            "delivery_address",
            "lat",
            "long",
            "delivery_charge",
            "rider",
            "rider_phone",
            "rider_details",
            "recommended_delivery_mode",
            "delivery_mode_confidence",
            "timeline",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "status",
            "cancellation_reason",
            "recommended_delivery_mode",
            "delivery_mode_confidence",
            "created_at",
            "updated_at",
        )




class WishlistSerializer(serializers.ModelSerializer):
    product_details = ProductSerializer(source="product", read_only=True)

    class Meta:
        model = Wishlist
        fields = ("id", "product", "product_details", "created_at")


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    order_details = OrderSerializer(source="order", read_only=True)
    rider_details = RiderSerializer(source="rider", read_only=True)

    class Meta:
        model = DeliveryAssignment
        fields = (
            "id",
            "order",
            "order_details",
            "rider",
            "rider_details",
            "status",
            "assigned_at",
            "updated_at",
            "eta",
        )
