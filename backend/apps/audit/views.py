from rest_framework import viewsets

from apps.accounts.permissions import require
from apps.accounts.roles import Cap

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [require(Cap.VIEW_AUDIT)]
    filterset_fields = ["action"]
