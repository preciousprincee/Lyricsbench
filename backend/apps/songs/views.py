from rest_framework import permissions, viewsets
from rest_framework.response import Response

from .models import Song
from .serializers import SongSerializer


class SongViewSet(viewsets.ModelViewSet):
    """Full CRUD for the current user's songs. Always scoped to
    request.user (a Profile) — nobody can see or touch another user's
    songs, enforced at the queryset level, not just permission checks.

    POST also acts as an upsert keyed on `id`: the frontend generates a
    UUID client-side for a brand-new song and autosaves to the same
    endpoint from then on, mirroring the original localStorage `saveSong`
    API instead of forcing a separate create/update split in the UI.
    """
    serializer_class = SongSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Song.objects.filter(profile=self.request.user)

    def create(self, request, *args, **kwargs):
        song_id = request.data.get("id")
        if song_id:
            existing = Song.objects.filter(id=song_id, profile=request.user).first()
            if existing:
                serializer = self.get_serializer(existing, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(profile=self.request.user)
