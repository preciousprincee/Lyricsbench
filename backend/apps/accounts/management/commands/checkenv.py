from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Prints a checklist of required environment variables and their status."

    def handle(self, *args, **options):
        checks = [
            ("Database (SQLite, no config needed)", bool(settings.DATABASES["default"].get("NAME"))),
            ("REDIS_URL (needed once you run >1 worker)", bool(settings.REDIS_URL)),
            ("GROQ_API_KEY", bool(settings.GROQ_API_KEY)),
            ("DJANGO_SECRET_KEY (change before deploying)", settings.SECRET_KEY != "insecure-dev-key-change-me"),
        ]
        self.stdout.write(self.style.MIGRATE_HEADING("LyricBench backend — environment checklist"))
        for label, ok in checks:
            mark = self.style.SUCCESS("OK") if ok else self.style.WARNING("MISSING")
            self.stdout.write(f"  [{mark}] {label}")
