import importlib
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured

GOOD = {
    "DJANGO_SECRET_KEY": "k" * 64 + "Zq9",
    "DJANGO_ALLOWED_HOSTS": "ciat.example.org",
    "DATABASE_URL": "postgres://u:p@h:5432/d",
    "CORS_ALLOWED_ORIGINS": "https://ciat.example.org",
}


def load(monkeypatch, **env):
    for k in GOOD:
        monkeypatch.delenv(k, raising=False)
    for k, v in {**GOOD, **env}.items():
        if v is not None:
            monkeypatch.setenv(k, v)
    sys.modules.pop("config.settings.prod", None)
    return importlib.import_module("config.settings.prod")


def test_prod_accepts_valid_configuration(monkeypatch):
    module = load(monkeypatch)
    assert module.DEBUG is False and module.SECURE_SSL_REDIRECT and module.SESSION_COOKIE_SECURE and module.X_FRAME_OPTIONS == "DENY"


@pytest.mark.parametrize(
    "override",
    [
        {"DJANGO_SECRET_KEY": None},
        {"DJANGO_SECRET_KEY": "court"},
        {"DJANGO_SECRET_KEY": "dev-" + "a" * 80},
        {"DJANGO_ALLOWED_HOSTS": None},
        {"DJANGO_ALLOWED_HOSTS": "*"},
        {"DATABASE_URL": None},
        {"CORS_ALLOWED_ORIGINS": "http://insecure.example.org"},
    ],
)
def test_prod_refuses_dangerous_configuration(monkeypatch, override):
    with pytest.raises(ImproperlyConfigured):
        load(monkeypatch, **override)
