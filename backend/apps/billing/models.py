from django.db import models

from apps.accounts.models import Profile


class Subscription(models.Model):
    """
    Tracks a user's Paystack subscription. Paystack's subscription model:
    a Customer subscribes to a Plan, producing a Subscription with its own
    `subscription_code` and an `email_token` (needed to manage/cancel it
    via the API — Paystack doesn't have a Stripe-style hosted portal, so
    the email_token is how we generate a "manage my billing" link).
    """

    class Status(models.TextChoices):
        INCOMPLETE = "incomplete", "Incomplete"
        ACTIVE = "active", "Active"
        NON_RENEWING = "non_renewing", "Non-renewing (cancels at period end)"
        ATTENTION = "attention", "Needs attention (payment issue)"
        COMPLETED = "completed", "Completed"
        CANCELED = "cancelled", "Cancelled"

    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name="subscription")

    paystack_customer_code = models.CharField(max_length=255, unique=True)
    paystack_subscription_code = models.CharField(max_length=255, blank=True, null=True, unique=True)
    paystack_email_token = models.CharField(max_length=255, blank=True)
    paystack_plan_code = models.CharField(max_length=255, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.INCOMPLETE)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)

    # Populated from the Paystack plan so the admin can compute MRR without
    # calling the Paystack API on every page load. Paystack amounts are in
    # the subunit for the currency (kobo for NGN, cents for USD, etc.) —
    # same idea as Stripe cents, so we keep the field name for continuity.
    unit_amount_cents = models.PositiveIntegerField(default=0, help_text="Price per billing interval, in the currency's subunit (e.g. kobo for NGN).")
    currency = models.CharField(max_length=10, blank=True, default="NGN")
    billing_interval = models.CharField(max_length=20, blank=True, default="monthly")  # "monthly" | "annually"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def monthly_amount_cents(self):
        """Normalizes yearly plans down to a monthly figure for MRR math."""
        if self.billing_interval in ("annually", "yearly", "year"):
            return round(self.unit_amount_cents / 12)
        return self.unit_amount_cents

    def __str__(self):
        return f"{self.profile.email} — {self.status}"


class BillingEvent(models.Model):
    """Raw audit log of every Paystack webhook received, for support/debugging."""
    paystack_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    profile = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name="billing_events")
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-received_at"]

    def __str__(self):
        return f"{self.event_type} @ {self.received_at:%Y-%m-%d %H:%M}"
