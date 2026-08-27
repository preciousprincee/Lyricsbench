from rest_framework import serializers

from .models import SoundBible


class SoundBibleSerializer(serializers.ModelSerializer):
    # Frontend uses camelCase keys (matches the existing React app's data shape)
    rhymeHabits = serializers.CharField(source="rhyme_habits", required=False, allow_blank=True)
    structureHabits = serializers.CharField(source="structure_habits", required=False, allow_blank=True)
    toneDefault = serializers.CharField(source="tone_default", required=False, allow_blank=True)

    class Meta:
        model = SoundBible
        fields = [
            "themes", "vocabulary", "imagery", "rhymeHabits",
            "structureHabits", "toneDefault", "influences", "freeform",
            "onboarded", "updated_at",
        ]
        read_only_fields = ["updated_at"]
