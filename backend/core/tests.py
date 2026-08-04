from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from .models import Category, Shop, Product, Order, ShopOwner, UserProfile, Inventory
from .serializers import UserSerializer


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

    def test_user_serializer_prefers_shop_owner_profile_over_phone_username(self):
        user = User.objects.create_user(username='user_9000000001', password='test-pass-123')
        ShopOwner.objects.create(user=user, phone='9000000001')

        self.assertEqual(UserSerializer(user).data['role'], 'shopowner')


class OTPLoginRoleTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def verify_login(self, phone, role):
        return self.client.post('/api/auth/verify-otp/', {
            'phone': phone,
            'otp': '123456',
            'role': role,
        }, format='json')

    def test_customer_login_stays_customer_for_shop_seed_like_phone(self):
        response = self.verify_login('9000000001', 'customer')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['role'], 'customer')
        self.assertTrue(User.objects.filter(username='user_9000000001').exists())
        self.assertFalse(ShopOwner.objects.filter(phone='9000000001').exists())

    def test_shop_owner_login_opens_shop_dashboard_role(self):
        response = self.verify_login('9000000002', 'shopowner')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['role'], 'shopowner')
        self.assertTrue(ShopOwner.objects.filter(phone='9000000002').exists())

    def test_customer_choice_wins_even_if_user_has_shop_profile(self):
        user = User.objects.create_user(username='user_9000000003', password='test-pass-123')
        UserProfile.objects.create(user=user, phone='9000000003')
        ShopOwner.objects.create(user=user, phone='9000000003')

        response = self.verify_login('9000000003', 'customer')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['user']['role'], 'customer')

    def test_new_shop_owner_dashboard_gets_starter_inventory(self):
        category = Category.objects.create(name='Grocery', slug='grocery')
        Product.objects.create(name='Rice', category=category, price=80, selling_price=80, status='active', visibility=True)
        Product.objects.create(name='Tea', category=category, price=120, selling_price=120, status='active', visibility=True)

        login_response = self.verify_login('9000000004', 'shopowner')
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}")
        products_response = self.client.get('/api/shops/my-products/')

        self.assertEqual(products_response.status_code, 200)
        self.assertGreaterEqual(products_response.data['total_count'], 2)
        self.assertEqual(len(products_response.data['products']), 2)
        self.assertEqual(Inventory.objects.count(), 2)
