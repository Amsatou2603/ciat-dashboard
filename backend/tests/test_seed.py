import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import User
from apps.projects.models import Project

pytestmark = pytest.mark.django_db


def test_seed_is_idempotent_and_flags_demo_data(settings):
    settings.DEBUG = True
    call_command("seed_demo")
    first = Project.objects.count()
    call_command("seed_demo")
    assert Project.objects.count() == first > 20
    assert not Project.objects.filter(is_demo=False).exists()
    assert not User.objects.exists()  # aucun compte sans --with-users


def test_seed_refused_outside_debug(settings, monkeypatch):
    settings.DEBUG = False
    monkeypatch.delenv("ALLOW_DEMO_SEED", raising=False)
    with pytest.raises(CommandError):
        call_command("seed_demo")


def test_seed_users_get_random_password_when_none_given(settings, capsys):
    settings.DEBUG = True
    call_command("seed_demo", "--with-users")
    assert User.objects.count() == 4 and "affiché une seule fois" in capsys.readouterr().out


def test_createsuperuser_gets_admin_role():
    user = User.objects.create_superuser(username="root", email="root@test.invalid", password="Mot-de-passe-Solide-42")
    assert user.role == "admin" and user.is_superuser
