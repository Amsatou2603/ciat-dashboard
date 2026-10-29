from datetime import date, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.partnerships.models import Funding, Partner, Partnership
from apps.projects.models import Cohort, Domain, Porteur, Project

PASSWORD = "Mot-de-passe-Solide-42"
GUARD = {"HTTP_X_CIAT_CLIENT": "web"}


def make_user(username, role):
    return User.objects.create_user(username=username, password=PASSWORD, role=role, email=f"{username}@test.invalid")


@pytest.fixture
def users(db):
    return {r: make_user(r, r) for r in (Role.ADMIN, Role.COORDINATOR, Role.ANALYST, Role.READER)}


@pytest.fixture
def client_for(users):
    def _make(role):
        client = APIClient()
        client.force_authenticate(users[role])
        return client

    return _make


@pytest.fixture
def anon():
    return APIClient()


@pytest.fixture
def world(db):
    """Petit monde déterministe dont les indicateurs attendus sont calculables à la main."""
    today = timezone.localdate()
    tic, agri = Domain.objects.get(code="tic-ia-donnees"), Domain.objects.get(code="agriculture")
    c1 = Cohort.objects.create(name="C1", year=2024, start_date=date(2024, 9, 1), end_date=date(2025, 6, 30))
    c2 = Cohort.objects.create(name="C2", year=2025, start_date=date(2025, 9, 1), end_date=date(2026, 6, 30))
    p_f = Porteur.objects.create(full_name="Awa T.", gender="F")
    p_m = Porteur.objects.create(full_name="Moussa K.", gender="M")

    def project(title, cohort, domain, porteur, status, received, progress=0, deadline=None, stage="AUCUN", start=None):
        return Project.objects.create(
            title=title,
            cohort=cohort,
            domain=domain,
            porteur=porteur,
            status=status,
            received_date=received,
            progress=progress,
            deadline=deadline,
            prototype_stage=stage,
            start_date=start,
        )

    a = project("A", c1, tic, p_f, "EN_INCUBATION", date(2024, 10, 5), 40, today - timedelta(days=10), start=date(2024, 11, 1))  # en retard
    b = project("B", c1, tic, p_f, "PROTOTYPAGE", date(2024, 11, 5), 80, today + timedelta(days=30), "PROTOTYPE", date(2024, 12, 1))
    c = project("C", c2, agri, p_m, "REJETE", date(2025, 10, 5))
    d = project(
        "D", c2, agri, p_m, "TERMINE", date(2025, 11, 5), 100, today - timedelta(days=50), "MVP", date(2025, 12, 1)
    )  # terminé : pas en retard
    e = project("E", c2, tic, p_m, "SELECTIONNE", date(2025, 12, 5), 20, None, "MAQUETTE")  # sans échéance
    partner = Partner.objects.create(name="Part", kind="FINANCEUR")
    Partnership.objects.create(project=a, partner=partner, nature="TECHNIQUE")
    Partnership.objects.create(project=b, partner=partner, nature="MENTORAT")
    Funding.objects.create(project=a, partner=partner, amount_xof=1_000_000, status="OBTENU", date=date(2025, 1, 1))
    Funding.objects.create(project=a, partner=partner, amount_xof=500_000, status="OBTENU", date=date(2025, 2, 1))
    Funding.objects.create(project=b, partner=partner, amount_xof=300_000, status="PROMIS", date=date(2025, 3, 1))
    return {"projects": dict(a=a, b=b, c=c, d=d, e=e), "c1": c1, "c2": c2, "tic": tic, "agri": agri, "p_f": p_f, "p_m": p_m}
