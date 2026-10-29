from django.conf import settings
from rest_framework import serializers

from .models import AssistantExchange


class AskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=settings.AI_MAX_QUESTION_CHARS, trim_whitespace=True)
    filters = serializers.DictField(child=serializers.JSONField(), required=False, default=dict)

    def validate_filters(self, value):
        allowed = {"period_start", "period_end", "cohort", "domain", "subdomain", "status", "porteur"}
        unknown = set(value) - allowed
        if unknown:
            raise serializers.ValidationError(f"Filtres inconnus : {', '.join(sorted(unknown))}")
        return {k: v for k, v in value.items() if v not in ("", None, [])}


class ExchangeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantExchange
        fields = ["id", "question", "answer", "intent", "ai_generated", "created_at"]
