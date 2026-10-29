from django.conf import settings
from django.db import models


class AssistantExchange(models.Model):
    """Historique limité (AI_HISTORY_LIMIT par utilisateur), visible et effaçable uniquement par son auteur."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assistant_exchanges")
    question = models.CharField(max_length=500)
    answer = models.TextField()
    intent = models.CharField(max_length=30)
    ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
