from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = 'Seed sample users'

    def handle(self, *args, **options):
        User = get_user_model()
        User.objects.update_or_create(username='admin', defaults={'email': 'admin@example.com'})
        self.stdout.write(self.style.SUCCESS('Seeded users'))
