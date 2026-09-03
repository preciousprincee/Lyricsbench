"""
Token authentication backed entirely by Django: users register/log in
against RegisterView/LoginView (see views.py), which hand back a DRF
authtoken. Every subsequent request sends `Authorization: Token <token>`.

This wraps DRF's built-in TokenAuthentication so that `request.user` ends
up being the app's `Profile` (not the raw Django `User`) — the rest of the
codebase (songs, soundbible, aiproxy) was written against a profile-shaped
`request.user`, so this keeps that contract without touching those apps.
"""
from django.utils import timezone
from rest_framework import exceptions
from rest_framework.authentication import TokenAuthentication

from .models import Profile


class ProfileTokenAuthentication(TokenAuthentication):
    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)

        profile, _created = Profile.objects.get_or_create(
            user=user,
            defaults={"email": user.email},
        )

        if profile.status == Profile.Status.SUSPENDED:
            raise exceptions.AuthenticationFailed("This account has been suspended.")

        profile.last_seen_at = timezone.now()
        profile.save(update_fields=["last_seen_at"])

        return (profile, token)
