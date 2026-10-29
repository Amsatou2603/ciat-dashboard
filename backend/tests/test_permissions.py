import pytest

from apps.accounts.models import Role, User

pytestmark = pytest.mark.django_db


def project_payload(world, **over):
    base = {
        "title": "Nouveau projet",
        "cohort": world["c1"].pk,
        "domain": world["tic"].pk,
        "porteur": world["p_f"].pk,
        "received_date": "2025-01-10",
        "status": "RECU",
        "progress": 0,
    }
    base.update(over)
    return base


@pytest.mark.parametrize("role,can_write", [(Role.ADMIN, True), (Role.COORDINATOR, True), (Role.ANALYST, False), (Role.READER, False)])
def test_write_permissions_by_role(client_for, world, role, can_write):
    response = client_for(role).post("/api/projects/", project_payload(world), format="json")
    assert (response.status_code == 201) == can_write
    if not can_write:
        assert response.status_code == 403


@pytest.mark.parametrize("role,expected", [(Role.ADMIN, 204), (Role.COORDINATOR, 204), (Role.ANALYST, 403), (Role.READER, 403)])
def test_delete_permissions_by_role(client_for, world, role, expected):
    pid = world["projects"]["c"].pk
    assert client_for(role).delete(f"/api/projects/{pid}/").status_code == expected


@pytest.mark.parametrize("role,expected", [(Role.ADMIN, 200), (Role.COORDINATOR, 403), (Role.ANALYST, 403), (Role.READER, 403)])
def test_user_management_is_admin_only(client_for, role, expected):
    assert client_for(role).get("/api/auth/users/").status_code == expected


def test_reader_cannot_export_or_use_assistant(client_for, world):
    reader = client_for(Role.READER)
    assert reader.get("/api/analytics/export/pdf/").status_code == 403
    assert reader.post("/api/assistant/ask/", {"question": "Combien de projets ?"}, format="json").status_code == 403


def test_reader_gets_masked_personal_data(client_for, world):
    data = client_for(Role.READER).get("/api/projects/").data["results"]
    assert all(p["porteur_detail"]["gender"] is None and p["porteur_detail"]["full_name"].startswith("Porteur n°") for p in data)
    assert "Awa T." not in str(data)
    assert client_for(Role.READER).get("/api/porteurs/").status_code == 403
    assert client_for(Role.READER).get("/api/analytics/breakdown/?dimension=gender").data["available"] is False
    assert client_for(Role.READER).get(f"/api/analytics/indicators/?porteur={world['p_f'].pk}").status_code == 403


def test_analyst_sees_personal_data(client_for, world):
    assert client_for(Role.ANALYST).get("/api/analytics/breakdown/?dimension=gender").data["available"] is True


def test_role_escalation_through_payload_is_ignored(client_for, users):
    """Un utilisateur ne peut pas se promouvoir en envoyant is_staff/role dans une requête."""
    client = client_for(Role.ANALYST)
    client.patch("/api/auth/me/", {"role": "admin"}, format="json")  # méthode non supportée
    users[Role.ANALYST].refresh_from_db()
    assert users[Role.ANALYST].role == Role.ANALYST and not users[Role.ANALYST].is_staff


def test_admin_cannot_demote_self_or_delete_last_admin(client_for, users):
    admin = client_for(Role.ADMIN)
    uid = users[Role.ADMIN].pk
    assert admin.patch(f"/api/auth/users/{uid}/", {"role": "reader"}, format="json").status_code == 400
    assert admin.delete(f"/api/auth/users/{uid}/").status_code == 403


def test_admin_creates_user_with_hashed_password_and_no_leak(client_for):
    response = client_for(Role.ADMIN).post(
        "/api/auth/users/", {"username": "nouveau", "role": "analyst", "password": "Un-Mdp-Tres-Solide-9"}, format="json"
    )
    assert response.status_code == 201 and "password" not in response.data
    user = User.objects.get(username="nouveau")
    assert user.password.startswith(("md5$", "pbkdf2_sha256$")) and user.password != "Un-Mdp-Tres-Solide-9"
    assert (
        client_for(Role.ADMIN)
        .post("/api/auth/users/", {"username": "faible", "role": "reader", "password": "abc"}, format="json")
        .status_code
        == 400
    )


def test_mass_assignment_on_user_creation_is_ignored(client_for):
    client_for(Role.ADMIN).post(
        "/api/auth/users/",
        {"username": "x1", "role": "reader", "password": "Un-Mdp-Tres-Solide-9", "is_superuser": True, "is_staff": True},
        format="json",
    )
    user = User.objects.get(username="x1")
    assert not user.is_superuser and not user.is_staff


def test_audit_log_visible_to_admin_only(client_for):
    assert client_for(Role.ADMIN).get("/api/audit/").status_code == 200
    assert client_for(Role.COORDINATOR).get("/api/audit/").status_code == 403


def test_security_headers_present(client_for):
    response = client_for(Role.ADMIN).get("/api/health/")
    assert response["X-Content-Type-Options"] == "nosniff" and response["Cache-Control"] == "no-store"
    assert "default-src 'none'" in response["Content-Security-Policy"]


def test_health_reveals_nothing(anon):
    response = anon.get("/api/health/")
    assert response.status_code == 200 and response.json() == {"status": "ok"}
