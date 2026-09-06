from django.db import models

from apps.accounts.models import Profile


class AIRequestLog(models.Model):
    """One row per AI generation call. `month` (YYYY-MM) makes monthly
    quota counting a cheap indexed filter instead of a date-range scan,
    and gives the admin a simple usage-over-time view for free."""

    class Purpose(models.TextChoices):
        ONBOARDING_CHAT = "onboarding_chat", "Onboarding chat"
        ONBOARDING_EXTRACT = "onboarding_extract", "Onboarding extraction"
        GENERATE = "generate", "Lyric generation"
        RHYMES = "rhymes", "Rhyme suggestions"
        OTHER = "other", "Other"

    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="ai_requests")
    purpose = models.CharField(max_length=30, choices=Purpose.choices, default=Purpose.OTHER)
    model = models.CharField("AI model", max_length=100)
    month = models.CharField(max_length=7, db_index=True)  # "2026-08"

    prompt_tokens_estimate = models.PositiveIntegerField(default=0)
    completion_tokens_estimate = models.PositiveIntegerField(default=0)
    succeeded = models.BooleanField(default=True)
    error_message = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "AI request log"
        verbose_name_plural = "AI request logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["profile", "month"], name="airequest_profile_month_idx"),
        ]

    def __str__(self):
        return f"{self.profile.email} — {self.purpose} — {self.created_at:%Y-%m-%d %H:%M}"
