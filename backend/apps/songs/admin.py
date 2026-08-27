from django.contrib import admin

from .models import Song


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ("title", "profile", "line_count_display", "updated_at", "created_at")
    list_filter = ("updated_at", "created_at")
    search_fields = ("title", "lyrics", "profile__email")
    autocomplete_fields = ["profile"]
    readonly_fields = ("id", "created_at", "updated_at")
    fields = ("id", "profile", "title", "lyrics", "pre_write", "created_at", "updated_at")

    @admin.display(description="Lines")
    def line_count_display(self, obj):
        return obj.line_count
