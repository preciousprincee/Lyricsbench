from django.contrib import admin

from .models import SoundBible


@admin.register(SoundBible)
class SoundBibleAdmin(admin.ModelAdmin):
    list_display = ("profile", "onboarded", "vocabulary", "tone_default", "updated_at")
    list_filter = ("onboarded", "updated_at")
    search_fields = ("profile__email", "vocabulary", "imagery", "freeform")
    autocomplete_fields = ["profile"]
    readonly_fields = ("created_at", "updated_at")
