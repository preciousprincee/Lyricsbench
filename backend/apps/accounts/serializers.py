from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Profile


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "id", "email", "display_name", "status",
            "created_at", "last_seen_at",
        ]
        read_only_fields = ["id", "email", "status", "created_at", "last_seen_at"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        user = User.objects.create_user(username=email, email=email, password=validated_data["password"])
        Profile.objects.create(user=user, email=email)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        user = authenticate(username=email, password=attrs["password"])
        if user is None:
            raise serializers.ValidationError("Incorrect email or password.")
        profile = getattr(user, "profile", None)
        if profile and profile.status == Profile.Status.SUSPENDED:
            raise serializers.ValidationError("This account has been suspended.")
        attrs["user"] = user
        return attrs
