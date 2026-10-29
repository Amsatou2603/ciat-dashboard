from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import LoginView, LogoutView, MeView, PasswordChangeView, RefreshView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("password/", PasswordChangeView.as_view(), name="password-change"),
    path("", include(router.urls)),
]
