import pytest
from rest_framework.test import APIClient

from .conftest import PASSWORD

pytestmark = pytest.mark.django_db


def test_api_accepts_urls_without_trailing_slash(users):
    client = APIClient()
    assert client.get("/api/health").status_code == 200
    login = client.post("/api/auth/login", {"username": "admin", "password": PASSWORD}, format="json")  # POST sans redirection
    assert login.status_code == 200 and login.data["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    assert client.get("/api/analytics/indicators?cohort=").status_code == 200
    assert client.get("/api/projects").status_code == 200


def test_non_api_paths_are_untouched(anon):
    assert anon.get("/nimporte-quoi").status_code == 404
