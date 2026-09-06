from django.contrib import admin
from django.shortcuts import redirect
from django.urls import include, path

from apps.accounts.admin_dashboard import dashboard_view
from apps.accounts.health import health_check

urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("admin/dashboard/", dashboard_view, name="admin-dashboard"),
    # A real SaaS admin opens into an overview, not a raw model list — make
    # the dashboard the landing page at /admin/ itself. This only matches
    # the exact "/admin/" path (path() does literal matching for a plain
    # view, not a prefix), so every other /admin/... URL still falls
    # through to admin.site.urls below and works exactly as normal.
    path("admin/", lambda request: redirect("admin-dashboard")),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/sound-bible/", include("apps.soundbible.urls")),
    path("api/songs/", include("apps.songs.urls")),
    path("api/ai/", include("apps.aiproxy.urls")),
]
