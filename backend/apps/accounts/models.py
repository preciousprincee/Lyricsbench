import uuid

from django.conf import settings
from django.db import models


class Profile(models.Model):
    """
    One row per registered user, extending Django's built-in User with the
    app-specific bits (display name, status, activity). This is the anchor
    for everything else in the app (songs, sound bible, usage).
    """

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=120, blank=True)

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

    # --- DRF/Django auth duck-typing -------------------------------------------
    # Profile stands in for `request.user` (see authentication.py). These
    # properties let DRF's IsAuthenticated permission and admin-adjacent code
    # treat it like a normal auth user without subclassing AbstractUser.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False
