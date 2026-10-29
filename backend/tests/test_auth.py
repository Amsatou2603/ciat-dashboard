import pytest
from django.conf import settings
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.audit.models import AuditLog

from .conftest import GUARD, PASSWORD

pytestmark = pytest.mark.django_db


def login(client, username, password=PASSWORD):
    return client.post("/api/auth/login/", {"username": username, "password": password}, format="json")


def test_login_success_returns_access_and_httponly_cookie(users):
    response = login(APIClient(), "admin")
    assert response.status_code == 200
    assert response.data["access"] and response.data["user"]["role"] == "admin"
    assert "password" not in response.content.decode()
    cookie = response.cookies[settings.REFRESH_COOKIE_NAME]
    assert cookie["httponly"] and cookie["path"] == "/api/auth/" and cookie["samesite"] == "Strict"
    assert "refresh" not in response.data  # le jeton de rafraîchissement n'est jamais lisible par le JS


def test_login_wrong_password_is_generic_and_audited(users):
    response = login(APIClient(), "admin", "faux")
    unknown = login(APIClient(), "inconnu", "faux")
    assert response.status_code == unknown.status_code == 401
    assert response.data["message"] == unknown.data["message"]  # pas d'énumération de comptes
    assert AuditLog.objects.filter(action="login_failed").count() == 2


def test_account_locks_after_repeated_failures(users):
    cache.clear()
    client = APIClient()
    for _ in range(settings.LOGIN_MAX_FAILURES):
        assert login(client, "analyst", "faux").status_code == 401
    assert login(client, "analyst").status_code == 429  # même avec le bon mot de passe
    cache.clear()


def test_inactive_user_cannot_login(users):
    users[Role.READER].is_active = False
    users[Role.READER].save()
    assert login(APIClient(), "reader").status_code == 401


def test_protected_routes_require_authentication(anon):
    for url in (
        "/api/projects/",
        "/api/analytics/indicators/",
        "/api/auth/me/",
        "/api/auth/users/",
        "/api/assistant/status/",
        "/api/analytics/export/pdf/",
    ):
        assert anon.get(url).status_code == 401, url


def test_refresh_requires_guard_header_and_rotates_token(users):
    client = APIClient()
    login(client, "analyst")
    assert client.post("/api/auth/refresh/").status_code == 403  # sans en-tête anti-CSRF
    first_cookie = client.cookies[settings.REFRESH_COOKIE_NAME].value
    ok = client.post("/api/auth/refresh/", **GUARD)
    assert ok.status_code == 200 and ok.data["access"]
    assert client.cookies[settings.REFRESH_COOKIE_NAME].value != first_cookie  # rotation
    replay = APIClient()
    replay.cookies[settings.REFRESH_COOKIE_NAME] = first_cookie
    assert replay.post("/api/auth/refresh/", **GUARD).status_code == 401  # ancien jeton révoqué


def test_logout_revokes_refresh_token(users):
    client = APIClient()
    login(client, "analyst")
    token = client.cookies[settings.REFRESH_COOKIE_NAME].value
    assert client.post("/api/auth/logout/", **GUARD).status_code == 204
    other = APIClient()
    other.cookies[settings.REFRESH_COOKIE_NAME] = token
    assert other.post("/api/auth/refresh/", **GUARD).status_code == 401


def test_deactivated_user_cannot_refresh(users):
    client = APIClient()
    login(client, "analyst")
    User.objects.filter(username="analyst").update(is_active=False)
    assert client.post("/api/auth/refresh/", **GUARD).status_code == 401


def test_me_exposes_capabilities_from_server_matrix(client_for):
    caps = client_for(Role.READER).get("/api/auth/me/").data["capabilities"]
    assert "view_dashboard" in caps and "export" not in caps and "manage_users" not in caps


def test_password_change_validates_strength(client_for):
    client = client_for(Role.ANALYST)
    assert client.post("/api/auth/password/", {"old_password": PASSWORD, "new_password": "123"}, format="json").status_code == 400
    assert (
        client.post("/api/auth/password/", {"old_password": "faux", "new_password": "Nouveau-Mdp-Solide-77"}, format="json").status_code
        == 400
    )
    assert (
        client.post("/api/auth/password/", {"old_password": PASSWORD, "new_password": "Nouveau-Mdp-Solide-77"}, format="json").status_code
        == 204
    )
