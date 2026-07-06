from django.contrib import admin
from .models import Shop, Product, Order, Category, ShopProduct

admin.site.register(Shop)
admin.site.register(Product)
admin.site.register(Order)
admin.site.register(Category)
admin.site.register(ShopProduct)
