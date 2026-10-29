from django.conf import settings
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import require
from apps.accounts.roles import Cap
from apps.audit.utils import record

from . import providers, service
from .models import AssistantExchange
from .serializers import AskSerializer, ExchangeSerializer


class AiRateThrottle(UserRateThrottle):
    scope = "ai"


class AskView(APIView):
    permission_classes = [require(Cap.USE_AI)]
    throttle_classes = [AiRateThrottle]

    def post(self, request):
        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = service.ask(request, serializer.validated_data["question"], serializer.validated_data["filters"])
        record(
            request, "assistant_ask", "assistant", result["id"], extra={"intent": result["intent"], "ai": result["ai_generated"]}
        )  # jamais le texte
        return Response(result)


class StatusView(APIView):
    permission_classes = [require(Cap.USE_AI)]

    def get(self, request):
        return Response(
            {
                "configured": providers.get_provider() is not None,
                "disclaimer": service.DISCLAIMER,
                "max_question_chars": settings.AI_MAX_QUESTION_CHARS,
            }
        )


class HistoryView(APIView):
    permission_classes = [require(Cap.USE_AI)]

    def get(self, request):
        qs = AssistantExchange.objects.filter(user=request.user)[: settings.AI_HISTORY_LIMIT]  # uniquement SON historique
        return Response({"items": ExchangeSerializer(qs, many=True).data})

    def delete(self, request):
        AssistantExchange.objects.filter(user=request.user).delete()
        return Response(status=204)


from drf_spectacular.types import OpenApiTypes  # noqa: E402
from drf_spectacular.utils import extend_schema  # noqa: E402

AskView.post = extend_schema(request=AskSerializer, responses=OpenApiTypes.OBJECT)(AskView.post)
StatusView.get = extend_schema(responses=OpenApiTypes.OBJECT)(StatusView.get)
HistoryView.get = extend_schema(responses=OpenApiTypes.OBJECT)(HistoryView.get)
HistoryView.delete = extend_schema(responses={204: None})(HistoryView.delete)
