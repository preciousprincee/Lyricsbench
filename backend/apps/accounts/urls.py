from django.urls import path

from .views import MeSummaryView, MeView

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("me/summary/", MeSummaryView.as_view(), name="me-summary"),
]
