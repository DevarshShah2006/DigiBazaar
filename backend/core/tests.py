from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import Category, Shop, Product, Order, ShopOwner


User = get_user_model()


class CoreModelsTest(TestCase):
    def build_shop_owner(self, username='owner'):
        user = User.objects.create_user(username=username, password='test-pass-123')
        return ShopOwner.objects.create(user=user)

    def test_shop_str(self):
        owner = self.build_shop_owner()
        shop = Shop.objects.create(name='Test Shop', owner=owner, lat=23.0, long=72.0)
        self.assertEqual(str(shop), 'Test Shop')

    def test_product_str(self):
        owner = self.build_shop_owner('owner2')
        category = Category.objects.create(name='Grocery', slug='grocery')
        product = Product.objects.create(name='Test Product', category=category, price=9.99)
        shop = Shop.objects.create(name='Test Shop', owner=owner, lat=23.0, long=72.0)
        shop.products.add(product)
        self.assertEqual(str(product), 'Test Product')

    def test_order_str(self):
        owner = self.build_shop_owner('owner3')
        shop = Shop.objects.create(name='Test Shop', owner=owner, lat=23.0, long=72.0)
        order = Order.objects.create(user=owner.user, shop=shop)
        self.assertEqual(str(order), f'Order #{order.pk} ({order.status})')
