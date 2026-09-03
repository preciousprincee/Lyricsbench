from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.shortcuts import render
from django.utils import timezone

from apps.aiproxy.models import AIRequestLog
from apps.songs.models import Song

from .models import Profile


@staff_member_required
def dashboard_view(request):
    now = timezone.now()
    month_key = now.strftime("%Y-%m")
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = Profile.objects.count()
    new_signups_7d = Profile.objects.filter(created_at__gte=week_ago).count()
    new_signups_30d = Profile.objects.filter(created_at__gte=month_ago).count()

    ai_calls_this_month = AIRequestLog.objects.filter(month=month_key).count()
    ai_failures_this_month = AIRequestLog.objects.filter(month=month_key, succeeded=False).count()

    top_active_users = (
        AIRequestLog.objects.filter(month=month_key)
        .values("profile__email")
        .annotate(calls=Count("id"))
        .order_by("-calls")[:10]
    )

    context = {
        "title": "Growth dashboard",
        "total_users": total_users,
        "new_signups_7d": new_signups_7d,
        "new_signups_30d": new_signups_30d,
        "ai_calls_this_month": ai_calls_this_month,
        "ai_failures_this_month": ai_failures_this_month,
        "total_songs": Song.objects.count(),
        "top_active_users": top_active_users,
    }
    return render(request, "admin/dashboard.html", context)
