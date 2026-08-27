from datetime import timedelta

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count
from django.shortcuts import render
from django.utils import timezone

from apps.aiproxy.models import AIRequestLog
from apps.billing.models import Subscription
from apps.songs.models import Song

from .models import Profile


@staff_member_required
def dashboard_view(request):
    now = timezone.now()
    month_key = now.strftime("%Y-%m")
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    active_subs = Subscription.objects.filter(status__in=["active", "trialing"])
    mrr_cents = sum(s.monthly_amount_cents for s in active_subs)
    primary_currency = active_subs.first().currency if active_subs.exists() else "NGN"
    currency_symbol = "₦" if primary_currency == "NGN" else primary_currency + " "

    total_users = Profile.objects.count()
    pro_users = Profile.objects.filter(plan=Profile.Plan.PRO).count()
    free_users = total_users - pro_users
    new_signups_7d = Profile.objects.filter(created_at__gte=week_ago).count()
    new_signups_30d = Profile.objects.filter(created_at__gte=month_ago).count()

    canceled_30d = Subscription.objects.filter(
        status=Subscription.Status.CANCELED, updated_at__gte=month_ago
    ).count()

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
        "currency_symbol": currency_symbol,
        "mrr": mrr_cents / 100,
        "arr": mrr_cents * 12 / 100,
        "active_subscriptions": active_subs.count(),
        "total_users": total_users,
        "pro_users": pro_users,
        "free_users": free_users,
        "conversion_rate": round((pro_users / total_users * 100), 1) if total_users else 0,
        "new_signups_7d": new_signups_7d,
        "new_signups_30d": new_signups_30d,
        "canceled_30d": canceled_30d,
        "ai_calls_this_month": ai_calls_this_month,
        "ai_failures_this_month": ai_failures_this_month,
        "total_songs": Song.objects.count(),
        "top_active_users": top_active_users,
    }
    return render(request, "admin/dashboard.html", context)
