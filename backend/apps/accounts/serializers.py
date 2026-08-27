from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id", "email", "display_name", "plan", "status",
            "created_at", "last_seen_at",
        ]
        read_only_fields = ["id", "email", "plan", "status", "created_at", "last_seen_at"]
