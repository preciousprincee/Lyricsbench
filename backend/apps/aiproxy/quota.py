"""
Monthly AI-generation quota, enforced via an atomic cache counter rather
than `AIRequestLog.objects.filter(...).count()`.

Why: under real concurrency, "SELECT count(*) ... ; if under limit, allow"
is a check-then-act race — many simultaneous requests can each read the
same pre-increment count and all pass the check, letting a user blow past
their quota. A cache INCR is atomic across processes (when backed by
Redis, see CACHES in settings.py), so it's both correct under concurrency
and far cheaper than a COUNT(*) query on every single AI call.

AIRequestLog rows are still written for every call — that's the durable
audit trail the admin reads — this counter is purely the fast gate that
decides whether to allow the call at all.
"""
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

_TTL_SECONDS = 40 * 24 * 3600  # comfortably longer than any calendar month


def _cache_key(profile_id, month):
    return f"ai-quota:{profile_id}:{month}"


def month_key():
    return timezone.now().strftime("%Y-%m")


def quota_for(profile):
    # No paywall/plans for the MVP — everyone gets the same monthly
    # allowance, just enough to stop runaway/abusive usage.
    return settings.MONTHLY_AI_GENERATIONS_LIMIT


def current_usage(profile, month=None):
    return cache.get(_cache_key(profile.id, month or month_key()), 0)


def try_consume(profile, month=None):
    """Atomically reserves one generation. Returns (allowed, used_after,
    limit). If not allowed, no increment is applied."""
    month = month or month_key()
    limit = quota_for(profile)
    key = _cache_key(profile.id, month)

    # cache.add sets the key only if absent — establishes the TTL exactly
    # once per user per month, so the counter still expires naturally.
    cache.add(key, 0, timeout=_TTL_SECONDS)
    new_value = cache.incr(key)

    if new_value > limit:
        cache.decr(key)  # give back the reservation we didn't use
        return False, limit, limit

    return True, new_value, limit


def refund(profile, month=None):
    """Called when a reserved generation ultimately failed (e.g. Groq
    errored) so it doesn't count against the user's quota."""
    key = _cache_key(profile.id, month or month_key())
    try:
        cache.decr(key)
    except ValueError:
        pass  # key expired/missing — nothing to refund
