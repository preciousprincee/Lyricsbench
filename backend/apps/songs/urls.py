from rest_framework.routers import DefaultRouter

from .views import SongViewSet

router = DefaultRouter(trailing_slash=True)
router.register(r"", SongViewSet, basename="song")

urlpatterns = router.urls
