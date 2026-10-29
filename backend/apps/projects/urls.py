from rest_framework.routers import DefaultRouter

from .views import CohortViewSet, DomainViewSet, PorteurViewSet, ProjectViewSet, SubdomainViewSet

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("cohorts", CohortViewSet, basename="cohort")
router.register("domains", DomainViewSet, basename="domain")
router.register("subdomains", SubdomainViewSet, basename="subdomain")
router.register("porteurs", PorteurViewSet, basename="porteur")
urlpatterns = router.urls
