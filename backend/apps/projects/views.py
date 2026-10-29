from django.db.models import Count, IntegerField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce
from rest_framework import viewsets

from apps.accounts.permissions import ReadOrWrite, require
from apps.accounts.roles import Cap
from apps.audit.utils import record

from .filters import ProjectFilter
from .models import Cohort, Domain, Porteur, Project, Subdomain
from .serializers import CohortSerializer, DomainSerializer, PorteurSerializer, ProjectSerializer, SubdomainSerializer


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [ReadOrWrite]
    filterset_class = ProjectFilter
    search_fields = ["title", "description"]
    ordering_fields = ["received_date", "title", "progress", "deadline", "status", "updated_at"]

    def get_queryset(self):
        from apps.partnerships.models import Funding  # import tardif : évite une dépendance circulaire

        funding_sum = (
            Funding.objects.filter(project=OuterRef("pk"), status="OBTENU")
            .order_by()
            .values("project")
            .annotate(total=Sum("amount_xof"))
            .values("total")
        )
        return (
            Project.objects.select_related("cohort", "domain", "subdomain", "porteur")
            .order_by("-received_date", "-id")
            .annotate(
                partnerships_count=Count("partnerships", distinct=True),
                funding_obtained=Coalesce(Subquery(funding_sum, output_field=IntegerField()), 0),
            )
        )

    def perform_create(self, serializer):
        project = serializer.save(created_by=self.request.user)
        record(self.request, "project_create", "project", project.pk)

    def perform_update(self, serializer):
        project = serializer.save()
        record(self.request, "project_update", "project", project.pk)

    def perform_destroy(self, instance):
        record(self.request, "project_delete", "project", instance.pk)
        instance.delete()


class ReferenceViewSet(viewsets.ModelViewSet):
    """Cohortes / domaines : lecture pour tout utilisateur connecté, écriture pour les rôles autorisés."""

    pagination_class = None

    def get_permissions(self):
        from rest_framework.permissions import IsAuthenticated

        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [require(Cap.WRITE_PROJECTS)()]


class CohortViewSet(ReferenceViewSet):
    queryset = Cohort.objects.all()
    serializer_class = CohortSerializer
    http_method_names = ["get", "post", "put", "patch", "head", "options"]  # pas de suppression : données liées


class DomainViewSet(ReferenceViewSet):
    queryset = Domain.objects.all()
    serializer_class = DomainSerializer
    http_method_names = ["get", "head", "options"]  # référentiel fixé par migration


class SubdomainViewSet(ReferenceViewSet):
    queryset = Subdomain.objects.select_related("domain")
    serializer_class = SubdomainSerializer
    http_method_names = ["get", "head", "options"]  # référentiel fixé par migration


class PorteurViewSet(viewsets.ModelViewSet):
    serializer_class = PorteurSerializer
    search_fields = ["full_name"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_permissions(self):
        # Données personnelles : réservées aux rôles disposant de VIEW_PERSONAL ; écriture : WRITE_PROJECTS.
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [require(Cap.VIEW_PERSONAL)()]
        return [require(Cap.WRITE_PROJECTS)()]

    def get_queryset(self):
        return Porteur.objects.annotate(projects_count=Count("projects"))
