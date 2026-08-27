from django.db import models

from apps.accounts.models import Profile


class SoundBible(models.Model):
    """A user's persistent lyrical-style profile. One per user."""

    profile = models.OneToOneField(Profile, on_delete=models.CASCADE, related_name="sound_bible")

    themes = models.JSONField(default=list, blank=True)
    vocabulary = models.CharField(max_length=500, blank=True)
    imagery = models.CharField(max_length=500, blank=True)
    rhyme_habits = models.CharField(max_length=500, blank=True)
    structure_habits = models.CharField(max_length=500, blank=True)
    tone_default = models.CharField(max_length=500, blank=True)
    influences = models.JSONField(default=list, blank=True)
    freeform = models.TextField(blank=True)

    onboarded = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Sound Bible"
        verbose_name_plural = "Sound Bibles"

    def __str__(self):
        return f"Sound Bible — {self.profile.email}"
