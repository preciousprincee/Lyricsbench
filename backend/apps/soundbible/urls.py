from django.urls import path

from .views import SoundBibleView

urlpatterns = [
    path("", SoundBibleView.as_view(), name="sound-bible"),
]
