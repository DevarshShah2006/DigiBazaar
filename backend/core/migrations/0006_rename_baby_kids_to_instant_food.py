from django.db import migrations


def rename_baby_kids_to_instant_food(apps, schema_editor):
    Category = apps.get_model("core", "Category")
    Product = apps.get_model("core", "Product")
    Subcategory = apps.get_model("core", "Subcategory")
    Shop = apps.get_model("core", "Shop")

    old_categories = Category.objects.filter(name__in=["Baby & Kids", "Baby Care"])
    target = Category.objects.filter(slug="instant-food").first()

    if target is None:
        old = old_categories.first()
        if old is None:
            return
        old.name = "Instant Food"
        old.slug = "instant-food"
        old.description = old.description or "Instant food products"
        old.save(update_fields=["name", "slug", "description"])
        return

    target.name = "Instant Food"
    target.description = target.description or "Instant food products"
    target.save(update_fields=["name", "description"])

    for old in old_categories.exclude(pk=target.pk):
        Product.objects.filter(category=old).update(category=target)
        Subcategory.objects.filter(category=old).update(category=target)
        for shop in Shop.objects.filter(categories=old):
            shop.categories.add(target)
            shop.categories.remove(old)
        old.delete()


def rename_instant_food_to_baby_kids(apps, schema_editor):
    Category = apps.get_model("core", "Category")
    Category.objects.filter(slug="instant-food").update(
        name="Baby & Kids",
        slug="baby-kids",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_add_quantity_label_nullable_rating"),
    ]

    operations = [
        migrations.RunPython(
            rename_baby_kids_to_instant_food,
            rename_instant_food_to_baby_kids,
        ),
    ]
