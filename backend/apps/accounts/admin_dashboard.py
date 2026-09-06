from datetime import timedelta

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils import timezone

from apps.aiproxy.models import AIRequestLog
from apps.songs.models import Song

from .models import Profile


def _daily_series(queryset, days, date_field="created_at"):
    """Returns a list of {date, count} for each of the last `days` days
    (oldest first, zero-filled) so the template can render a simple bar
    chart without needing a JS charting library for an MVP dashboard."""
    since = timezone.now() - timedelta(days=days - 1)
    rows = (
        queryset.filter(**{f"{date_field}__gte": since})
        .annotate(day=TruncDate(date_field))
        .values("day")
        .annotate(count=Count("id"))
    )
    counts_by_day = {row["day"]: row["count"] for row in rows}

    today = timezone.now().date()
    series = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        series.append({"date": day, "count": counts_by_day.get(day, 0)})
    return series


@staff_member_required
def dashboard_view(request):
    now = timezone.now()
    month_key = now.strftime("%Y-%m")
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    # --- Top-line KPIs ---------------------------------------------------
    total_users = Profile.objects.count()
    suspended_users = Profile.objects.filter(status=Profile.Status.SUSPENDED).count()
    new_signups_7d = Profile.objects.filter(created_at__gte=week_ago).count()
    new_signups_30d = Profile.objects.filter(created_at__gte=month_ago).count()

    # "Active" = actually did something (wrote/edited a song, or used AI) —
    # a far more honest engagement signal than signup count alone, since a
    # user can register and never come back.
    active_song_ids = set(
        Song.objects.filter(updated_at__gte=week_ago).values_list("profile_id", flat=True)
    )
    active_ai_ids = set(
        AIRequestLog.objects.filter(created_at__gte=week_ago).values_list("profile_id", flat=True)
    )
    active_users_7d = len(active_song_ids | active_ai_ids)
    activation_rate = round((active_users_7d / total_users) * 100, 1) if total_users else 0

    total_songs = Song.objects.count()
    songs_created_7d = Song.objects.filter(created_at__gte=week_ago).count()

    ai_calls_today = AIRequestLog.objects.filter(created_at__gte=day_ago).count()
    ai_calls_7d = AIRequestLog.objects.filter(created_at__gte=week_ago).count()
    ai_calls_month = AIRequestLog.objects.filter(month=month_key).count()
    ai_failures_month = AIRequestLog.objects.filter(month=month_key, succeeded=False).count()
    ai_failure_rate = round((ai_failures_month / ai_calls_month) * 100, 1) if ai_calls_month else 0

    # --- 14-day trend lines (for the bar charts) --------------------------
    signup_series = _daily_series(Profile.objects.all(), 14, "created_at")
    ai_call_series = _daily_series(AIRequestLog.objects.all(), 14, "created_at")
    max_signup_day = max((d["count"] for d in signup_series), default=0) or 1
    max_ai_day = max((d["count"] for d in ai_call_series), default=0) or 1
    for d in signup_series:
        d["pct"] = round((d["count"] / max_signup_day) * 100)
    for d in ai_call_series:
        d["pct"] = round((d["count"] / max_ai_day) * 100)

    # --- Model usage breakdown, this month --------------------------------
    model_breakdown = list(
        AIRequestLog.objects.filter(month=month_key)
        .values("model")
        .annotate(calls=Count("id"))
        .order_by("-calls")
    )
    max_model_calls = max((m["calls"] for m in model_breakdown), default=0) or 1
    for m in model_breakdown:
        m["pct"] = round((m["calls"] / max_model_calls) * 100)

    # --- Users approaching their monthly AI quota -------------------------
    # A real "who's about to hit a wall" list — useful the moment you add
    # any kind of paid tier, and useful right now for spotting your most
    # engaged users even without one. Uses each user's actual effective
    # limit (their admin override if set, else the app-wide default) —
    # not a single flat number, since overrides make that no longer true
    # for everyone.
    default_limit = settings.MONTHLY_AI_GENERATIONS_LIMIT
    usage_by_profile = (
        AIRequestLog.objects.filter(month=month_key)
        .values("profile__email", "profile__ai_quota_override")
        .annotate(used=Count("id"))
        .order_by("-used")
    )
    quota_pressure = []
    for row in usage_by_profile:
        effective_limit = row["profile__ai_quota_override"]
        if effective_limit is None:
            effective_limit = default_limit
        if effective_limit and row["used"] / effective_limit >= 0.8:
            quota_pressure.append({
                "profile__email": row["profile__email"],
                "used": row["used"],
                "limit": effective_limit,
                "pct": round((row["used"] / effective_limit) * 100),
            })
    quota_pressure = quota_pressure[:10]

    # --- Recent signups & top active users --------------------------------
    recent_signups = (
        Profile.objects.order_by("-created_at")
        .annotate(song_count=Count("songs", distinct=True))
        .values("email", "created_at", "song_count", "status")[:10]
    )

    top_active_users = (
        AIRequestLog.objects.filter(month=month_key)
        .values("profile__email")
        .annotate(calls=Count("id"))
        .order_by("-calls")[:10]
    )

    context = {
        "title": "LyricsBench admin",
        "total_users": total_users,
        "suspended_users": suspended_users,
        "new_signups_7d": new_signups_7d,
        "new_signups_30d": new_signups_30d,
        "active_users_7d": active_users_7d,
        "activation_rate": activation_rate,
        "total_songs": total_songs,
        "songs_created_7d": songs_created_7d,
        "ai_calls_today": ai_calls_today,
        "ai_calls_7d": ai_calls_7d,
        "ai_calls_month": ai_calls_month,
        "ai_failure_rate": ai_failure_rate,
        "signup_series": signup_series,
        "ai_call_series": ai_call_series,
        "model_breakdown": model_breakdown,
        "quota_pressure": quota_pressure,
        "quota_limit": default_limit,
        "recent_signups": recent_signups,
        "top_active_users": top_active_users,
    }
    return render(request, "admin/dashboard.html", context)
