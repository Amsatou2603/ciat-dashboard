import pytest

from apps.accounts.models import Role
from apps.audit.models import AuditLog
from apps.projects.models import Project

from .test_permissions import project_payload

pytestmark = pytest.mark.django_db


def test_create_update_and_persistence(client_for, world):
    client = client_for(Role.COORDINATOR)
    created = client.post("/api/projects/", project_payload(world, title="Persisté"), format="json")
    assert created.status_code == 201
    pid = created.data["id"]
    assert Project.objects.get(pk=pid).title == "Persisté"  # réellement en base
    updated = client.patch(
        f"/api/projects/{pid}/",
        {"status": "SELECTIONNE", "progress": 30, "start_date": "2025-02-01", "deadline": "2025-12-01"},
        format="json",
    )
    assert updated.status_code == 200
    assert client.get(f"/api/projects/{pid}/").data["progress"] == 30
    assert AuditLog.objects.filter(action="project_create", object_id=str(pid)).exists()


@pytest.mark.parametrize(
    "override,field",
    [
        ({"progress": 150}, "progress"),
        ({"progress": -1}, "progress"),
        ({"status": "TERMINE", "progress": 50}, "progress"),
        ({"status": "REJETE", "progress": 20}, "progress"),
        ({"start_date": "2025-02-01", "deadline": "2025-01-01"}, "deadline"),
        ({"start_date": "2024-01-01"}, "start_date"),
        ({"prototype_stage": "MVP", "status": "RECU"}, "prototype_stage"),
        ({"status": "INCONNU"}, "status"),
        ({"title": ""}, "title"),
    ],
)
def test_project_validation_errors(client_for, world, override, field):
    response = client_for(Role.COORDINATOR).post("/api/projects/", project_payload(world, **override), format="json")
    assert response.status_code == 400 and field in response.data["details"]


def test_read_only_fields_cannot_be_forced(client_for, world):
    response = client_for(Role.COORDINATOR).post("/api/projects/", project_payload(world, is_demo=True, id=9999), format="json")
    assert response.status_code == 201 and response.data["is_demo"] is False and response.data["id"] != 9999


def test_unknown_project_returns_404_in_standard_format(client_for):
    response = client_for(Role.ANALYST).get("/api/projects/424242/")
    assert response.status_code == 404 and set(response.data) == {"code", "message", "details"}


def test_pagination_is_bounded(client_for, world):
    response = client_for(Role.ANALYST).get("/api/projects/?page_size=100000")
    assert response.status_code == 200 and len(response.data["results"]) <= 100


def test_search_and_ordering(client_for, world):
    client = client_for(Role.ANALYST)
    assert client.get("/api/projects/?search=A").status_code == 200
    ordered = client.get("/api/projects/?ordering=title").data["results"]
    assert [p["title"] for p in ordered] == sorted(p["title"] for p in ordered)


def test_sql_injection_attempt_in_search_is_inert(client_for, world):
    response = client_for(Role.ANALYST).get("/api/projects/?search=' OR 1=1; DROP TABLE projects_project;--")
    assert response.status_code == 200 and response.data["count"] == 0 and Project.objects.count() == 5


def test_cannot_delete_cohort_with_projects_and_domains_are_readonly(client_for, world):
    client = client_for(Role.ADMIN)
    assert client.delete(f"/api/cohorts/{world['c1'].pk}/").status_code == 405
    assert client.post("/api/domains/", {"code": "x", "label": "X"}, format="json").status_code == 405


def test_funding_validation(client_for, world):
    pid = world["projects"]["a"].pk
    from apps.partnerships.models import Partner

    partner = Partner.objects.first().pk
    client = client_for(Role.COORDINATOR)
    assert (
        client.post(
            "/api/fundings/", {"project": pid, "partner": partner, "amount_xof": 0, "date": "2025-01-01", "status": "OBTENU"}, format="json"
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/fundings/",
            {"project": pid, "partner": partner, "amount_xof": 10**12, "date": "2025-01-01", "status": "OBTENU"},
            format="json",
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/fundings/",
            {"project": pid, "partner": partner, "amount_xof": 250000, "date": "2025-01-01", "status": "OBTENU"},
            format="json",
        ).status_code
        == 201
    )


def test_duplicate_partnership_is_rejected(client_for, world):
    from apps.partnerships.models import Partner

    body = {"project": world["projects"]["a"].pk, "partner": Partner.objects.first().pk, "nature": "TECHNIQUE"}
    assert client_for(Role.COORDINATOR).post("/api/partnerships/", body, format="json").status_code == 400
