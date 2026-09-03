from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.aiproxy import quota

from .models import Profile
from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer


class RegisterView(APIView):
    """Creates a Django User + Profile and returns an auth token, so the
    frontend can sign the person straight in — no email confirmation step,
    to keep the MVP frictionless."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "profile": ProfileSerializer(user.profile).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "profile": ProfileSerializer(user.profile).data})


class LogoutView(APIView):
    """Deletes the current token so it can no longer be used. Purely a
    courtesy — the frontend also drops the token from localStorage."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user__profile=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH the current user's profile (display name, etc.)."""
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user  # Profile, set by ProfileTokenAuthentication


class MeSummaryView(APIView):
    """Everything the frontend shell needs in one call after login: profile
    plus current AI-generation usage. Usage comes from the same
    cache-backed counter apps/aiproxy uses to gate requests, so this
    reflects the true remaining quota under concurrent load instead of a
    slightly-stale COUNT(*) over AIRequestLog."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = request.user
        month = quota.month_key()
        used = quota.current_usage(profile, month)
        limit = quota.quota_for(profile)

        return Response({
            "profile": ProfileSerializer(profile).data,
            "usage": {
                "month": month,
                "generations_used": used,
                "generations_limit": limit,
                "remaining": max(limit - used, 0),
            },
        })
