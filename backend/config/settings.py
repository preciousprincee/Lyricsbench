"""
Django settings for the LyricBench backend.

Identity model:
  - App users authenticate with Django's own auth system (User model +
    DRF authtoken). The frontend logs in/registers against
    apps.accounts.views (RegisterView/LoginView), gets back a token, and
    sends it as `Authorization: Token <token>` on every API call.
  - The same Django admin (/admin/) is used for staff/ops access, via
    normal Django session login.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "insecure-dev-key-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "False") == "True"
ALLOWED_HOSTS = [h.strip() for h in os.getenv("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
# Render sets this automatically to <service-name>.onrender.com — pick it up
# without requiring you to hardcode/guess the hostname in env vars.
RENDER_EXTERNAL_HOSTNAME = os.getenv("RENDER_EXTERNAL_HOSTNAME")
if RENDER_EXTERNAL_HOSTNAME:
    ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

INSTALLED_APPS = [
    "jazzmin",  # must be before django.contrib.admin
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "django_filters",
    "apps.accounts",
    "apps.soundbible",
    "apps.songs",
    "apps.aiproxy",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # CorsMiddleware must sit above anything that can return a response on
    # its own (whitenoise, CommonMiddleware) — otherwise those responses
    # skip CORS entirely and the browser blocks them with no server-side
    # error to explain why.
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
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

# --- Database ---------------------------------------------------------------
# Render (and most PaaS hosts) give you a Postgres connection string via
# DATABASE_URL and an ephemeral filesystem — so a local SQLite file would be
# wiped on every deploy/restart. If DATABASE_URL is set, use it; otherwise
# fall back to local SQLite for local dev only.
DATABASE_URL = os.getenv("DATABASE_URL", "")
if DATABASE_URL:
    import dj_database_url
    DATABASES = {
        "default": dj_database_url.parse(DATABASE_URL, conn_max_age=600, ssl_require=True)
    }
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
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Cache (Redis) --------------------------------------------------------------
# Not optional once you run more than one gunicorn worker or more than one
# server: Django's default LocMemCache is per-process, so DRF's request
# throttling and the AI monthly-quota counters (see apps/aiproxy) would
# silently stop being enforced correctly across workers without a shared
# backend. Falls back to local memory only when REDIS_URL is unset, which
# is fine for a single-process local dev server.
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
        "apps.accounts.authentication.ProfileTokenAuthentication",
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

# --- Groq (server-side only) ------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_DEFAULT_MODEL = os.getenv("GROQ_DEFAULT_MODEL", "openai/gpt-oss-120b")
GROQ_ALLOWED_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
]

# --- AI usage limit ------------------------------------------------------------
# No paywall/plans for the MVP — every account gets the same generous
# monthly allowance, just enough to stop runaway/abusive usage.
MONTHLY_AI_GENERATIONS_LIMIT = int(os.getenv("MONTHLY_AI_GENERATIONS_LIMIT", "500"))

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
        "aiproxy.AIRequestLog": "fas fa-robot",
    },
    "order_with_respect_to": ["accounts", "songs", "soundbible", "aiproxy"],
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

# --- Logging ---------------------------------------------------------------
# Without this, Django's default logging tries to email admins on unhandled
# 500s (which does nothing — no email backend is configured) instead of
# printing to console, so real errors were invisible in Render's log viewer.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "django.request": {"handlers": ["console"], "level": "ERROR", "propagate": False},
    },
}
