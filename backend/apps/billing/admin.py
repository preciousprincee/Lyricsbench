from django.contrib import admin

from .models import BillingEvent, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("profile", "status", "monthly_amount_display", "billing_interval", "current_period_end", "cancel_at_period_end")
    list_filter = ("status", "billing_interval", "cancel_at_period_end")
    search_fields = ("profile__email", "paystack_customer_code", "paystack_subscription_code")
    autocomplete_fields = ["profile"]
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Monthly value")
    def monthly_amount_display(self, obj):
        symbol = "₦" if obj.currency == "NGN" else obj.currency + " "
        return f"{symbol}{obj.monthly_amount_cents / 100:,.2f}"


@admin.register(BillingEvent)
class BillingEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "profile", "paystack_event_id", "received_at")
    list_filter = ("event_type", "received_at")
    search_fields = ("paystack_event_id", "profile__email")
    readonly_fields = ("paystack_event_id", "event_type", "profile", "payload", "received_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
