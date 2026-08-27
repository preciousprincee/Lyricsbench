from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.aiproxy import quota
from apps.billing.models import Subscription

from .serializers import ProfileSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH the current user's profile (name, etc.). Plan/status are
    read-only here — they change only via the billing webhook or admin."""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user  # Profile, set by SupabaseAuthentication


class MeSummaryView(APIView):
    """Everything the frontend shell needs in one call after login: profile,
    plan limits, current usage, and subscription status. Usage comes from
    the same cache-backed counter apps/aiproxy uses to gate requests, so
    this reflects the true remaining quota under concurrent load instead
    of a slightly-stale COUNT(*) over AIRequestLog."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user
        month = quota.month_key()
        used = quota.current_usage(profile, month)
        limit = quota.quota_for(profile)
        sub = Subscription.objects.filter(profile=profile).first()

        return Response({
            "profile": ProfileSerializer(profile).data,
            "usage": {
                "month": month,
                "generations_used": used,
                "generations_limit": limit,
                "remaining": max(limit - used, 0),
            },
            "subscription": {
                "status": sub.status if sub else None,
                "current_period_end": sub.current_period_end if sub else None,
                "cancel_at_period_end": sub.cancel_at_period_end if sub else False,
            } if sub else None,
        })
