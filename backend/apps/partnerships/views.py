from rest_framework import viewsets

from apps.accounts.permissions import ReadOrWrite
from apps.audit.utils import record

from .models import Funding, Partner, Partnership
from .serializers import FundingSerializer, PartnerSerializer, PartnershipSerializer


class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [ReadOrWrite]
    search_fields = ["name"]
    filterset_fields = ["kind"]
    http_method_names = ["get", "post", "patch", "head", "options"]


class _AuditedViewSet(viewsets.ModelViewSet):
    permission_classes = [ReadOrWrite]
    filterset_fields = ["project", "status"]
    object_type = ""

    def perform_create(self, serializer):
        obj = serializer.save()
        record(self.request, f"{self.object_type}_create", self.object_type, obj.pk, extra={"project": obj.project_id})

    def perform_update(self, serializer):
        obj = serializer.save()
        record(self.request, f"{self.object_type}_update", self.object_type, obj.pk)

    def perform_destroy(self, instance):
        record(self.request, f"{self.object_type}_delete", self.object_type, instance.pk)
        instance.delete()


class PartnershipViewSet(_AuditedViewSet):
    queryset = Partnership.objects.select_related("partner", "project")
    serializer_class = PartnershipSerializer
    object_type = "partnership"
    ordering_fields = ["start_date", "created_at"]


class FundingViewSet(_AuditedViewSet):
    queryset = Funding.objects.select_related("partner", "project")
    serializer_class = FundingSerializer
    object_type = "funding"
    ordering_fields = ["date", "amount_xof"]
