from django.test import TestCase
from .models import Shop, Product, Order


class CoreModelsTest(TestCase):
    def test_shop_str(self):
        shop = Shop.objects.create(name='Test Shop')
        self.assertEqual(str(shop), 'Test Shop')

    def test_product_str(self):
        shop = Shop.objects.create(name='Test Shop')
        product = Product.objects.create(shop=shop, name='Test Product', price=9.99)
        self.assertEqual(str(product), 'Test Product')

    def test_order_str(self):
        shop = Shop.objects.create(name='Test Shop')
        product = Product.objects.create(shop=shop, name='Test Product', price=9.99)
        order = Order.objects.create(product=product, quantity=2)
        self.assertEqual(str(order), f'Order #{order.pk} - 2 x {product.name}')
