import uuid

from django.db import models


class Profile(models.Model):
    """
    One row per Supabase-authenticated end user. This is the anchor for
    everything else in the SaaS (songs, sound bible, subscription, usage).

    `supabase_uid` is the `sub` claim from the verified Supabase JWT — the
    permanent, stable identifier for that user in Supabase Auth.
    """

    class Plan(models.TextChoices):
        FREE = "free", "Free"
        PRO = "pro", "Pro"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supabase_uid = models.UUIDField(unique=True, db_index=True)
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True)

    plan = models.CharField(max_length=10, choices=Plan.choices, default=Plan.FREE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)

    is_staff_note = models.CharField(
        max_length=255, blank=True,
        help_text="Internal note visible only in the admin (support context, VIP flags, etc.)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.email

    @property
    def is_pro(self):
        return self.plan == Profile.Plan.PRO and self.status == Profile.Status.ACTIVE

    # --- DRF/Django auth duck-typing -------------------------------------------
    # Profile stands in for `request.user` (see SupabaseAuthentication). These
    # properties let DRF's IsAuthenticated permission and admin-adjacent code
    # treat it like a normal auth user without subclassing AbstractUser.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
