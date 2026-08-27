"""
Verifies Supabase Auth JWTs and maps them to local `Profile` rows.

Supabase issues JWTs one of two ways depending on project age/settings:
  1. Legacy: HS256 signed with a shared secret (Project Settings > API > JWT Secret)
  2. Newer:  RS256/ES256 signed, verifiable via the project's public JWKS at
             `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`

We support both: if SUPABASE_JWT_SECRET is set we verify with HS256 directly
(fast, no network call). Otherwise we fetch + cache the JWKS and verify with
the matching public key.
"""
import time

import jwt
import requests
from django.conf import settings
from rest_framework import authentication, exceptions

from .models import Profile

_jwks_cache = {"keys": None, "fetched_at": 0}
_JWKS_TTL_SECONDS = 3600


def _get_jwks():
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < _JWKS_TTL_SECONDS:
        return _jwks_cache["keys"]

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
    resp = requests.get(url, timeout=5)
    resp.raise_for_status()
    keys = resp.json().get("keys", [])
    _jwks_cache["keys"] = keys
    _jwks_cache["fetched_at"] = now
    return keys


def _verify_with_jwks(token):
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    keys = _get_jwks()
    matching = next((k for k in keys if k.get("kid") == kid), None)
    if matching is None:
        # cache might be stale (key rotation) — force a refresh once
        _jwks_cache["fetched_at"] = 0
        keys = _get_jwks()
        matching = next((k for k in keys if k.get("kid") == kid), None)
    if matching is None:
        raise exceptions.AuthenticationFailed("Unknown signing key.")

    public_key = jwt.PyJWK.from_json(__import__("json").dumps(matching)).key
    return jwt.decode(
        token,
        key=public_key,
        algorithms=[matching.get("alg", "RS256")],
        audience=settings.SUPABASE_JWT_AUDIENCE,
        options={"verify_aud": True},
    )


def decode_supabase_jwt(token):
    if settings.SUPABASE_JWT_SECRET:
        try:
            return jwt.decode(
                token,
                key=settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=settings.SUPABASE_JWT_AUDIENCE,
                options={"verify_aud": True},
            )
        except jwt.InvalidAudienceError:
            # Some Supabase configs omit the aud claim entirely; retry without it.
            return jwt.decode(
                token,
                key=settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
    return _verify_with_jwks(token)


class SupabaseAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8")
        if not auth_header or not auth_header.startswith(f"{self.keyword} "):
            return None  # no credentials supplied; let other/no auth classes handle it

        token = auth_header[len(self.keyword) + 1:].strip()
        if not token:
            return None

        try:
            payload = decode_supabase_jwt(token)
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("Session expired. Please sign in again.")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed("Invalid authentication token.")
        except requests.RequestException:
            raise exceptions.AuthenticationFailed("Could not verify session right now. Try again shortly.")

        supabase_uid = payload.get("sub")
        email = payload.get("email") or (payload.get("user_metadata") or {}).get("email")
        if not supabase_uid or not email:
            raise exceptions.AuthenticationFailed("Token missing required claims.")

        profile, created = Profile.objects.get_or_create(
            supabase_uid=supabase_uid,
            defaults={"email": email},
        )
        update_fields = []
        if not created and profile.email != email:
            profile.email = email
            update_fields.append("email")

        from django.utils import timezone
        profile.last_seen_at = timezone.now()
        update_fields.append("last_seen_at")
        profile.save(update_fields=update_fields)

        if profile.status == Profile.Status.SUSPENDED:
            raise exceptions.AuthenticationFailed("This account has been suspended.")

        return (profile, token)
