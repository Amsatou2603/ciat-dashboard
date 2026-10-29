from rest_framework.routers import DefaultRouter

from .views import FundingViewSet, PartnershipViewSet, PartnerViewSet

router = DefaultRouter()
router.register("partners", PartnerViewSet, basename="partner")
router.register("partnerships", PartnershipViewSet, basename="partnership")
router.register("fundings", FundingViewSet, basename="funding")
urlpatterns = router.urls
