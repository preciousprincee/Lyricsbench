import uuid

from django.db import models

from apps.accounts.models import Profile


class Song(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name="songs")

    title = models.CharField(max_length=255, blank=True, default="Untitled")
    lyrics = models.TextField(blank=True, default="")
    pre_write = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.title or 'Untitled'} ({self.profile.email})"

    @property
    def line_count(self):
        return len([l for l in (self.lyrics or "").split("\n") if l.strip()])
