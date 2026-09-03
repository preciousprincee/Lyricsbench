"""
Idempotently creates (or updates the password of) a Django superuser from
env vars, so a first-time Render deploy has a working /admin/ login without
needing an interactive shell session.

Set DJANGO_SUPERUSER_EMAIL and DJANGO_SUPERUSER_PASSWORD in the service's
env vars, and this runs safely on every deploy (build command) — it's a
no-op if the account already exists with the same password, and skips
entirely if either env var is missing so a normal `migrate`-only deploy
doesn't accidentally create a blank admin account.
"""
import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.accounts.models import Profile


class Command(BaseCommand):
    help = "Creates a Django superuser + Profile from DJANGO_SUPERUSER_EMAIL/PASSWORD env vars, if not already present."

    def handle(self, *args, **options):
        email = os.getenv("DJANGO_SUPERUSER_EMAIL")
        password = os.getenv("DJANGO_SUPERUSER_PASSWORD")

        if not email or not password:
            self.stdout.write("DJANGO_SUPERUSER_EMAIL/PASSWORD not set — skipping admin bootstrap.")
            return

        user, created = User.objects.get_or_create(
            username=email,
            defaults={"email": email, "is_staff": True, "is_superuser": True},
        )
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()

        Profile.objects.get_or_create(user=user, defaults={"email": email})

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{action} superuser {email}"))
