"""
Django settings for the LyricBench SaaS backend.

Identity model:
  - App users authenticate via Supabase Auth. The frontend gets a Supabase
    JWT and sends it as `Authorization: Bearer <token>` on every API call.
    apps.accounts.authentication.SupabaseAuthentication verifies that token
    and maps it to a local `Profile` row (created on first sight).
  - Django's own auth system (User/staff/superuser) is used ONLY for the
    Django admin (/admin/), i.e. for the LyricBench team, not for customers.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "jazzmin",  # must be before django.contrib.admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "django_filters",
    "apps.accounts",
    "apps.soundbible",
    "apps.songs",
    "apps.billing",
    "apps.aiproxy",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database: Supabase Postgres -------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=not DEBUG)
    }
    # Reuses pooled connections across requests instead of reconnecting to
    # Postgres every time — critical once you're serving real concurrency.
    # Pair this with Supabase's connection-pooling URI (port 6543, pgbouncer)
    # rather than the direct connection (port 5432) in production.
    DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Cache (Redis) --------------------------------------------------------------
# This is not optional once you run more than one gunicorn worker or more
# than one server: Django's default LocMemCache is per-process, so DRF's
# request throttling and the AI monthly-quota counters (see apps/aiproxy)
# would silently stop being enforced correctly across workers without a
# shared backend. Falls back to local memory only when REDIS_URL is unset,
# which is fine for a single-process local dev server.
REDIS_URL = os.getenv("REDIS_URL", "")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# --- CORS (the Vite/React frontend is a different origin) ------------------------
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# --- DRF ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.SupabaseAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "ai-generate": "30/min",
        "user": "600/min",
    },
    "EXCEPTION_HANDLER": "apps.accounts.exceptions.api_exception_handler",
}

# --- Supabase ------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")

# --- Paystack ----------------------------------------------------------------
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY", "")
PAYSTACK_PUBLIC_KEY = os.getenv("PAYSTACK_PUBLIC_KEY", "")
PAYSTACK_PLAN_CODE_PRO_MONTHLY = os.getenv("PAYSTACK_PLAN_CODE_PRO_MONTHLY", "")
PAYSTACK_PLAN_CODE_PRO_YEARLY = os.getenv("PAYSTACK_PLAN_CODE_PRO_YEARLY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# --- Groq (server-side only) ------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_DEFAULT_MODEL", "openai/gpt-oss-120b")
GROQ_ALLOWED_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
]

# --- Plan limits --------------------------------------------------------------
FREE_PLAN_MONTHLY_GENERATIONS = int(os.getenv("FREE_PLAN_MONTHLY_GENERATIONS", "40"))
PRO_PLAN_MONTHLY_GENERATIONS = int(os.getenv("PRO_PLAN_MONTHLY_GENERATIONS", "2000"))

# --- Jazzmin (admin skin) ---------------------------------------------------------
JAZZMIN_SETTINGS = {
    "site_title": "LyricBench Admin",
    "site_header": "LyricBench",
    "site_brand": "LyricBench",
    "welcome_sign": "LyricBench — operations console",
    "copyright": "LyricBench",
    "search_model": ["accounts.Profile", "songs.Song"],
    "show_sidebar": True,
    "navigation_expanded": True,
    "icons": {
        "auth.user": "fas fa-user-shield",
        "auth.Group": "fas fa-users",
        "accounts.Profile": "fas fa-user",
        "soundbible.SoundBible": "fas fa-book",
        "songs.Song": "fas fa-music",
        "billing.Subscription": "fas fa-credit-card",
        "aiproxy.AIRequestLog": "fas fa-robot",
    },
    "order_with_respect_to": ["accounts", "songs", "soundbible", "billing", "aiproxy"],
    "changeform_format": "horizontal_tabs",
    "topmenu_links": [
        {"name": "Growth Dashboard", "url": "admin-dashboard", "icon": "fas fa-chart-line"},
    ],
    "custom_links": {
        "accounts": [{
            "name": "Growth Dashboard",
            "url": "admin-dashboard",
            "icon": "fas fa-chart-line",
        }],
    },
}
JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "dark_mode_theme": None,
}

LOGIN_URL = "/admin/login/"
