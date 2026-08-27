from django.contrib import admin, messages
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone

from apps.aiproxy.models import AIRequestLog
from apps.songs.models import Song

from .models import Profile


class SongInline(admin.TabularInline):
    model = Song
    extra = 0
    fields = ("title", "updated_at", "line_count")
    readonly_fields = ("title", "updated_at", "line_count")
    can_delete = False
    show_change_link = True
    verbose_name_plural = "Recent songs (read-only preview)"

    def line_count(self, obj):
        return len([l for l in (obj.lyrics or "").split("\n") if l.strip()])

    def has_add_permission(self, request, obj=None):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).order_by("-updated_at")[:10]


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = (
        "email", "display_name", "plan_badge", "status_badge",
        "song_count", "usage_this_month", "created_at", "last_seen_at",
    )
    list_filter = ("plan", "status", "created_at")
    search_fields = ("email", "display_name", "supabase_uid")
    readonly_fields = ("id", "supabase_uid", "created_at", "updated_at", "last_seen_at")
    inlines = [SongInline]
    actions = ["comp_to_pro", "downgrade_to_free", "suspend_accounts", "reactivate_accounts"]
    fieldsets = (
        ("Identity", {"fields": ("id", "supabase_uid", "email", "display_name")}),
        ("Plan & status", {"fields": ("plan", "status", "is_staff_note")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_seen_at")}),
    )

    @admin.display(description="Plan")
    def plan_badge(self, obj):
        color = "#2f7a4f" if obj.plan == Profile.Plan.PRO else "#6b7280"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">{}</span>',
            color, obj.get_plan_display(),
        )

    @admin.display(description="Status")
    def status_badge(self, obj):
        color = "#2f7a4f" if obj.status == Profile.Status.ACTIVE else "#b3413e"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">{}</span>',
            color, obj.get_status_display(),
        )

    @admin.display(description="Songs")
    def song_count(self, obj):
        return Song.objects.filter(profile=obj).count()

    @admin.display(description="AI calls this month")
    def usage_this_month(self, obj):
        month_key = timezone.now().strftime("%Y-%m")
        return AIRequestLog.objects.filter(profile=obj, month=month_key).count()

    @admin.action(description="Comp selected users to Pro")
    def comp_to_pro(self, request, queryset):
        updated = queryset.update(plan=Profile.Plan.PRO)
        self.message_user(request, f"{updated} user(s) upgraded to Pro.", messages.SUCCESS)

    @admin.action(description="Downgrade selected users to Free")
    def downgrade_to_free(self, request, queryset):
        updated = queryset.update(plan=Profile.Plan.FREE)
        self.message_user(request, f"{updated} user(s) downgraded to Free.", messages.SUCCESS)

    @admin.action(description="Suspend selected accounts")
    def suspend_accounts(self, request, queryset):
        updated = queryset.update(status=Profile.Status.SUSPENDED)
        self.message_user(request, f"{updated} account(s) suspended.", messages.WARNING)

    @admin.action(description="Reactivate selected accounts")
    def reactivate_accounts(self, request, queryset):
        updated = queryset.update(status=Profile.Status.ACTIVE)
        self.message_user(request, f"{updated} account(s) reactivated.", messages.SUCCESS)
