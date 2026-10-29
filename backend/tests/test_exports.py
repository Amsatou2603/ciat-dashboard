import io

import pytest
from openpyxl import load_workbook

from apps.accounts.models import Role
from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db
URL = "/api/analytics/export/"


def test_xlsx_reflects_filters_and_is_valid(client_for, world):
    response = client_for(Role.ANALYST).get(URL + f"xlsx/?cohort={world['c1'].pk}")
    assert response.status_code == 200 and response["Content-Disposition"].startswith('attachment; filename="ciat-synthese-')
    wb = load_workbook(io.BytesIO(response.content))
    assert wb.sheetnames == ["Synthèse", "Projets"]
    titles = [r[0] for r in wb["Projets"].iter_rows(min_row=2, values_only=True)]
    assert sorted(titles) == ["A", "B"]  # uniquement la cohorte filtrée
    assert any("Cohorte" in str(c.value) for row in wb["Synthèse"].iter_rows() for c in row)


def test_xlsx_neutralizes_formula_injection(client_for, world):
    from apps.projects.models import Project

    Project.objects.filter(title="A").update(title='=HYPERLINK("http://evil","x")')
    wb = load_workbook(io.BytesIO(client_for(Role.ANALYST).get(URL + "xlsx/").content))
    titles = [r[0] for r in wb["Projets"].iter_rows(min_row=2, values_only=True)]
    assert all(not str(t).startswith("=") for t in titles)


def test_pdf_and_png_are_real_files(client_for, world):
    pdf = client_for(Role.COORDINATOR).get(URL + "pdf/")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF") and pdf["Content-Type"] == "application/pdf"
    png = client_for(Role.COORDINATOR).get(URL + "png/")
    assert png.status_code == 200 and png.content.startswith(b"\x89PNG") and len(png.content) > 5000


def test_exports_with_no_data_still_work(client_for, world):
    for fmt in ("xlsx", "pdf", "png"):
        response = client_for(Role.ANALYST).get(URL + f"{fmt}/?period_start=2030-01-01")
        assert response.status_code == 200 and len(response.content) > 1000, fmt
    wb = load_workbook(io.BytesIO(client_for(Role.ANALYST).get(URL + "xlsx/?period_start=2030-01-01").content))
    assert wb["Projets"]["A2"].value == "Aucun projet pour ces filtres."


def test_export_permissions_and_filter_validation(client_for, world, anon):
    assert client_for(Role.READER).get(URL + "pdf/").status_code == 403
    assert anon.get(URL + "pdf/").status_code == 401
    assert client_for(Role.ANALYST).get(URL + "exe/").status_code == 400
    assert client_for(Role.ANALYST).get(URL + "pdf/?period_start=2026-01-01&period_end=2025-01-01").status_code == 400


def test_export_is_audited(client_for, world):
    client_for(Role.ANALYST).get(URL + "pdf/")
    assert AuditLog.objects.filter(action="export", object_id="pdf").exists()


def test_export_row_limit(client_for, world, settings):
    settings.EXPORT_MAX_ROWS = 2
    wb = load_workbook(io.BytesIO(client_for(Role.ANALYST).get(URL + "xlsx/").content))
    assert wb["Projets"].max_row == 3  # en-tête + 2 lignes maximum
