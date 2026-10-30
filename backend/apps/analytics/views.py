from django.http import HttpResponse
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.accounts.permissions import require
from apps.accounts.roles import Cap, has_cap
from apps.audit.utils import record
from apps.projects.filters import filtered_projects
from apps.projects.models import Cohort, Domain, Porteur, Subdomain
from apps.projects.rules import STATUS_CHOICES

from . import exports, services


class ExportRateThrottle(UserRateThrottle):
    scope = "export"


class DashboardView(APIView):
    """Classe de base : contrôle d'accès + application des filtres validés."""

    permission_classes = [require(Cap.VIEW_DASHBOARD)]

    def projects(self, request):
        return filtered_projects(request.query_params, request.user)


class FilterOptionsView(DashboardView):
    def get(self, request):
        personal = has_cap(request.user, Cap.VIEW_PERSONAL)
        return Response(
            {
                "cohorts": [{"id": c.id, "name": c.name} for c in Cohort.objects.all()],
                "domains": [{"id": d.id, "label": d.label} for d in Domain.objects.all()],
                "subdomains": [{"id": x.id, "label": x.label, "domain": x.domain_id} for x in Subdomain.objects.all()],
                "statuses": [{"value": v, "label": label} for v, label in STATUS_CHOICES],
                "porteurs": [{"id": p.id, "full_name": p.full_name} for p in Porteur.objects.all()[:500]] if personal else [],
                "porteur_filter_available": personal,
            }
        )


class IndicatorsView(DashboardView):
    def get(self, request):
        return Response(services.compute_indicators(self.projects(request), params=request.query_params))


class TimeseriesView(DashboardView):
    def get(self, request):
        return Response({"items": services.timeseries(self.projects(request))})


class BreakdownView(DashboardView):
    def get(self, request):
        dimension = request.query_params.get("dimension", "status")
        if dimension not in ("status", "domain", "subdomain", "gender", "prototype"):
            raise ValidationError({"dimension": "Valeur inconnue (status, domain, subdomain, gender, prototype)."})
        if dimension == "gender" and not has_cap(request.user, Cap.VIEW_PERSONAL):
            return Response(
                {"dimension": dimension, "available": False, "reason": "Donnée personnelle non accessible pour votre rôle.", "items": []}
            )
        return Response({"dimension": dimension, "available": True, "items": services.breakdown(self.projects(request), dimension)})


class CohortsView(DashboardView):
    def get(self, request):
        return Response({"items": services.cohort_comparison(self.projects(request))})


class ProgressView(DashboardView):
    def get(self, request):
        return Response(services.progress_overview(self.projects(request)))


class LateView(DashboardView):
    def get(self, request):
        return Response({"items": services.late_projects(self.projects(request))})


class PartnershipsView(DashboardView):
    def get(self, request):
        return Response(services.partnerships_overview(self.projects(request)))


class FundingView(DashboardView):
    def get(self, request):
        return Response(services.funding_overview(self.projects(request)))


class AnnualBudgetsView(DashboardView):
    def get(self, request):
        return Response({"items": services.annual_budgets()})


class SummaryView(DashboardView):
    def get(self, request):
        return Response(services.summary(self.projects(request), request.query_params, has_cap(request.user, Cap.VIEW_PERSONAL)))


class ExportView(APIView):
    """Exports : mêmes filtres, mêmes droits que la consultation ; volume borné ; opération journalisée."""

    permission_classes = [require(Cap.VIEW_DASHBOARD, Cap.EXPORT)]
    throttle_classes = [ExportRateThrottle]
    kind = ""

    def get(self, request, fmt):
        projects = filtered_projects(request.query_params, request.user)
        personal = has_cap(request.user, Cap.VIEW_PERSONAL)
        data = services.summary(projects, request.query_params, personal)
        try:
            if fmt == "xlsx":
                content, mime = (
                    exports.build_xlsx(projects, request.query_params, data, personal),
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            elif fmt == "pdf":
                content, mime = exports.build_pdf(projects, request.query_params, data), "application/pdf"
            elif fmt == "png":
                content, mime = exports.build_png(projects, request.query_params, data), "image/png"
            else:
                raise ValidationError({"format": "Format inconnu (xlsx, pdf, png)."})
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur lors de la génération de l'export {fmt}: {type(e).__name__}: {str(e)}", exc_info=True)
            raise ValidationError({"export": f"Erreur lors de la génération de l'export: {type(e).__name__}"})
        record(request, "export", "analytics", fmt, extra={"rows": data["indicators"]["ideas_received"]})
        response = HttpResponse(content, content_type=mime)
        response["Content-Disposition"] = f'attachment; filename="{exports.filename("synthese", fmt)}"'
        response["X-Content-Type-Options"] = "nosniff"
        return response


# Documentation OpenAPI : paramètres de filtre communs et réponse JSON libre pour les vues analytiques.
def _document_views():
    from drf_spectacular.types import OpenApiTypes
    from drf_spectacular.utils import OpenApiParameter, extend_schema

    params = [
        OpenApiParameter("period_start", OpenApiTypes.DATE, description="Date de réception ≥"),
        OpenApiParameter("period_end", OpenApiTypes.DATE, description="Date de réception ≤"),
        OpenApiParameter("cohort", OpenApiTypes.INT),
        OpenApiParameter("domain", OpenApiTypes.INT),
        OpenApiParameter("status", OpenApiTypes.STR, many=True),
        OpenApiParameter("porteur", OpenApiTypes.INT),
    ]
    for view in (
        FilterOptionsView,
        IndicatorsView,
        TimeseriesView,
        BreakdownView,
        CohortsView,
        ProgressView,
        LateView,
        PartnershipsView,
        FundingView,
        SummaryView,
        AnnualBudgetsView,
    ):
        view.get = extend_schema(parameters=params, responses=OpenApiTypes.OBJECT)(view.get)
    ExportView.get = extend_schema(parameters=params, responses=OpenApiTypes.BINARY)(ExportView.get)


_document_views()
