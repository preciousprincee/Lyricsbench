from django.contrib import admin
from django.urls import include, path

from apps.accounts.admin_dashboard import dashboard_view
from apps.accounts.health import health_check

urlpatterns = [
    path("api/health/", health_check, name="health-check"),
    path("admin/dashboard/", dashboard_view, name="admin-dashboard"),
    path("admin/", admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/sound-bible/", include("apps.soundbible.urls")),
    path("api/songs/", include("apps.songs.urls")),
    path("api/ai/", include("apps.aiproxy.urls")),
]
