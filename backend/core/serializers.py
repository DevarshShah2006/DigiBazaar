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
        if hasattr(obj, 'shop_owner_profile'):
            return 'shopowner'
        elif hasattr(obj, 'rider_profile'):
            return 'rider'
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

    def get_category_name(self, obj):
        return obj.category.name if obj.category else None

    def get_category_slug(self, obj):
        return obj.category.slug if obj.category else None

    class Meta:
        model = Product
        fields = (
            'id',
            'name',
            'category',
            'category_name',
            'category_slug',
            'brand',
            'description',
            'price',
            'rating',
            'image_url',
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


class RiderSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Rider
        fields = (
            'id',
            'username',
            'phone',
            'is_online',
            'lat',
            'long',
            'rating',
            'vehicle_type',
            'vehicle_number',
        )


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    image_url = serializers.CharField(source="product.image_url", read_only=True)

    class Meta:
        model = OrderItem
        fields = ("id", "product", "product_name", "image_url", "quantity", "price_at_order")


class OrderSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()
    rider_details = RiderSerializer(source="rider", read_only=True)

    def get_total_price(self, obj):
        return sum(item.price_at_order * item.quantity for item in obj.items.all())

    class Meta:
        model = Order
        fields = (
            "id",
            "shop",
            "shop_name",
            "user",
            "user_name",
            "status",
            "items",
            "total_price",
            "fulfillment_option",
            "delivery_address",
            "lat",
            "long",
            "delivery_charge",
            "rider",
            "rider_details",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "status",
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

