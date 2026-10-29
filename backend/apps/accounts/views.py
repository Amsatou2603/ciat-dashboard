import logging

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.cache import cache
from rest_framework import status, viewsets
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.audit.utils import record

from .models import Role, User
from .permissions import require
from .roles import Cap
from .serializers import LoginSerializer, MeSerializer, PasswordChangeSerializer, UserAdminSerializer
from .throttles import LoginRateThrottle, RefreshRateThrottle

logger = logging.getLogger(__name__)


class InvalidCredentials(APIException):
    """401 explicite (AuthenticationFailed renverrait 403 car ces vues n'ont pas de classe d'authentification)."""

    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Identifiant ou mot de passe incorrect."
    default_code = "invalid_credentials"


class AccountLocked(APIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Trop de tentatives échouées. Réessayez dans quelques minutes."
    default_code = "account_locked"


def _set_refresh_cookie(response, refresh: str):
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        refresh,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
        path=settings.REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH, samesite=settings.REFRESH_COOKIE_SAMESITE)


def _require_guard_header(request):
    """Protection CSRF des routes basées sur cookie : un en-tête personnalisé déclenche un contrôle CORS préalable."""
    if request.headers.get(settings.CSRF_GUARD_HEADER) != "web":
        raise PermissionDenied("En-tête de protection manquant.")


def _lock_key(username: str) -> str:
    return f"login_fail:{username.strip().lower()}"


class LoginView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        key = _lock_key(username)
        if cache.get(key, 0) >= settings.LOGIN_MAX_FAILURES:
            record(request, "login_locked", "user", username, user=None)
            raise AccountLocked()
        user = authenticate(request, username=username, password=serializer.validated_data["password"])
        if user is None or not user.is_active:
            cache.set(key, cache.get(key, 0) + 1, settings.LOGIN_LOCK_SECONDS)
            record(request, "login_failed", "user", username, user=None)
            # Message identique pour compte inconnu / mot de passe faux : pas d'énumération d'utilisateurs.
            raise InvalidCredentials()
        cache.delete(key)
        refresh = RefreshToken.for_user(user)
        from django.contrib.auth.models import update_last_login

        update_last_login(None, user)
        record(request, "login", "user", user.pk, user=user)
        response = Response({"access": str(refresh.access_token), "user": MeSerializer(user).data})
        _set_refresh_cookie(response, str(refresh))
        return response


class RefreshView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]
    throttle_classes = [RefreshRateThrottle]

    def post(self, request):
        _require_guard_header(request)
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not token:
            raise InvalidCredentials("Session expirée.")
        try:
            user_id = RefreshToken(token)["user_id"]
            user = User.objects.get(pk=user_id, is_active=True)  # un compte désactivé ne peut plus renouveler
            data = TokenRefreshSerializer(data={"refresh": token})
            data.is_valid(raise_exception=True)  # fait tourner et blackliste l'ancien jeton
        except (TokenError, User.DoesNotExist, KeyError):
            response = Response({"code": "not_authenticated", "message": "Session expirée.", "details": None}, status=401)
            _clear_refresh_cookie(response)
            return response
        response = Response({"access": data.validated_data["access"], "user": MeSerializer(user).data})
        _set_refresh_cookie(response, data.validated_data["refresh"])
        return response


class LogoutView(APIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        _require_guard_header(request)
        token = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if token:
            try:
                RefreshToken(token).blacklist()  # révocation côté serveur
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(MeSerializer(request.user).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["old_password"]):
            raise ValidationError({"old_password": "Ancien mot de passe incorrect."})
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        record(request, "password_change", "user", request.user.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(viewsets.ModelViewSet):
    """Gestion des comptes : administrateurs uniquement."""

    queryset = User.objects.all().order_by("username")
    serializer_class = UserAdminSerializer
    permission_classes = [require(Cap.MANAGE_USERS)]
    search_fields = ["username", "first_name", "last_name", "email"]
    filterset_fields = ["role", "is_active"]
    ordering_fields = ["username", "date_joined", "last_login"]

    def perform_create(self, serializer):
        user = serializer.save()
        record(self.request, "user_create", "user", user.pk, extra={"role": user.role})

    def perform_update(self, serializer):
        user = serializer.save()
        record(self.request, "user_update", "user", user.pk, extra={"role": user.role, "active": user.is_active})

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("Vous ne pouvez pas supprimer votre propre compte.")
        if instance.role == Role.ADMIN and User.objects.filter(role=Role.ADMIN, is_active=True).count() <= 1:
            raise PermissionDenied("Impossible de supprimer le dernier administrateur.")
        record(self.request, "user_delete", "user", instance.pk)
        instance.delete()


from drf_spectacular.types import OpenApiTypes  # noqa: E402
from drf_spectacular.utils import extend_schema  # noqa: E402

LoginView.post = extend_schema(request=LoginSerializer, responses=OpenApiTypes.OBJECT)(LoginView.post)
RefreshView.post = extend_schema(request=None, responses=OpenApiTypes.OBJECT)(RefreshView.post)
LogoutView.post = extend_schema(request=None, responses={204: None})(LogoutView.post)
MeView.get = extend_schema(responses=MeSerializer)(MeView.get)
PasswordChangeView.post = extend_schema(request=PasswordChangeSerializer, responses={204: None})(PasswordChangeView.post)
