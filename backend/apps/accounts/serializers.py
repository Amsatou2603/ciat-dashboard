from django.contrib.auth import password_validation
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Role, User
from .roles import capabilities_for


class MeSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "role_label", "capabilities"]
        read_only_fields = fields

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_capabilities(self, user):
        return sorted(c.value for c in capabilities_for(user))


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=256, trim_whitespace=False, write_only=True)


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class UserAdminSerializer(serializers.ModelSerializer):
    """Champs explicitement listés : aucune affectation de masse possible (is_superuser, groups…)."""

    password = serializers.CharField(write_only=True, required=False, trim_whitespace=False)
    role = serializers.ChoiceField(choices=Role.choices)

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "email", "role", "is_active", "password", "last_login", "date_joined"]
        read_only_fields = ["id", "last_login", "date_joined"]

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Le mot de passe est obligatoire à la création."})
        request = self.context["request"]
        if self.instance is not None and self.instance.pk == request.user.pk:
            if attrs.get("role", self.instance.role) != Role.ADMIN or attrs.get("is_active", True) is False:
                raise serializers.ValidationError("Vous ne pouvez pas retirer vos propres droits ni désactiver votre compte.")
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # hachage Django (PBKDF2)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
