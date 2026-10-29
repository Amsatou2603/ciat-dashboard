from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ["id", "username", "action", "object_type", "object_id", "extra", "created_at"]
        read_only_fields = fields
