from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Category, Shop, Product, Order

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'slug')


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

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


class OrderSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "shop",
            "shop_name",
            "user",
            "user_name",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "status",
            "created_at",
            "updated_at",
        )
