from rest_framework import serializers

from .models import Song


class SongSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)
    preWrite = serializers.JSONField(source="pre_write", required=False, allow_null=True)
    createdAt = serializers.SerializerMethodField()
    updatedAt = serializers.SerializerMethodField()
    lineCount = serializers.IntegerField(source="line_count", read_only=True)

    class Meta:
        model = Song
        fields = ["id", "title", "lyrics", "preWrite", "createdAt", "updatedAt", "lineCount"]

    def get_createdAt(self, obj):
        return int(obj.created_at.timestamp() * 1000)

    def get_updatedAt(self, obj):
        return int(obj.updated_at.timestamp() * 1000)
