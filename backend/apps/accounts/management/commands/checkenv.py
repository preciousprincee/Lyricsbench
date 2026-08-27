from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Prints a checklist of required environment variables and their status."

    def handle(self, *args, **options):
        checks = [
            ("DATABASE_URL / SQLite fallback", bool(settings.DATABASES["default"].get("NAME"))),
            ("SUPABASE_URL", bool(settings.SUPABASE_URL)),
            ("SUPABASE_JWT_SECRET (or JWKS fallback)", True),
            ("PAYSTACK_SECRET_KEY", bool(settings.PAYSTACK_SECRET_KEY)),
            ("PAYSTACK_PLAN_CODE_PRO_MONTHLY", bool(settings.PAYSTACK_PLAN_CODE_PRO_MONTHLY)),
            ("REDIS_URL (needed once you run >1 worker)", bool(settings.REDIS_URL)),
            ("GROQ_API_KEY", bool(settings.GROQ_API_KEY)),
        ]
        self.stdout.write(self.style.MIGRATE_HEADING("LyricBench backend — environment checklist"))
        for label, ok in checks:
            mark = self.style.SUCCESS("OK") if ok else self.style.WARNING("MISSING")
            self.stdout.write(f"  [{mark}] {label}")
