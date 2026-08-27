from django.urls import path

from .views import CreateBillingPortalView, CreateCheckoutSessionView, PaystackWebhookView

urlpatterns = [
    path("checkout/", CreateCheckoutSessionView.as_view(), name="billing-checkout"),
    path("portal/", CreateBillingPortalView.as_view(), name="billing-portal"),
    path("webhook/", PaystackWebhookView.as_view(), name="billing-webhook"),
]
