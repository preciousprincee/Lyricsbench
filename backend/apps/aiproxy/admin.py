from django.contrib import admin

from .models import AIRequestLog


@admin.register(AIRequestLog)
class AIRequestLogAdmin(admin.ModelAdmin):
    list_display = ("profile", "purpose", "model", "month", "succeeded", "created_at")
    list_filter = ("purpose", "model", "succeeded", "month")
    search_fields = ("profile__email", "error_message")
    autocomplete_fields = ["profile"]
    readonly_fields = (
        "profile", "purpose", "model", "month", "prompt_tokens_estimate",
        "completion_tokens_estimate", "succeeded", "error_message", "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
