from rest_framework import permissions
from rest_framework.generics import RetrieveUpdateAPIView

from .models import SoundBible
from .serializers import SoundBibleSerializer


class SoundBibleView(RetrieveUpdateAPIView):
    """Every user has exactly one Sound Bible. GET creates an empty one on
    first access so the frontend can always assume it exists; PUT/PATCH
    saves onboarding results or manual edits."""
    serializer_class = SoundBibleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        bible, _created = SoundBible.objects.get_or_create(profile=self.request.user)
        return bible
