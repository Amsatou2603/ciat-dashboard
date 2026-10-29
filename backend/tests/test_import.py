"""Intégration du jeu de données du data analyst (`data/donnees_ciat.json`) : valeurs attendues recoupées avec son rapport."""

import json
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from apps.accounts.models import Role
from apps.partnerships.models import AnnualBudget, Funding, Partner, Partnership
from apps.projects.models import Cohort, Porteur, Project

DATA = Path(__file__).resolve().parents[2] / "data" / "donnees_ciat.json"
pytestmark = [pytest.mark.django_db, pytest.mark.skipif(not DATA.exists(), reason="data/donnees_ciat.json absent")]


@pytest.fixture
def imported():
    call_command("import_ciat_data", file=str(DATA))


def test_import_counts_and_idempotence(imported):
    assert (Cohort.objects.count(), Project.objects.count(), Porteur.objects.count(), AnnualBudget.objects.count()) == (4, 20, 25, 4)
    first = (Partner.objects.count(), Partnership.objects.count(), Funding.objects.count())
    call_command("import_ciat_data", file=str(DATA))  # deuxième exécution : aucun doublon
    assert (Project.objects.count(), Partner.objects.count(), Partnership.objects.count(), Funding.objects.count()) == (20, *first)


def test_imported_data_is_flagged_simulated_and_personal_data_minimised(imported):
    assert not Project.objects.filter(is_demo=False).exists() and not Porteur.objects.filter(is_demo=False).exists()
    names = " ".join(Porteur.objects.values_list("full_name", flat=True))
    assert "@" not in names and "+221" not in names  # ni e-mail ni téléphone


def test_officiel_flag_marks_data_as_real():
    call_command("import_ciat_data", file=str(DATA), officiel=True)
    assert not Project.objects.filter(is_demo=True).exists()


def test_dry_run_writes_nothing():
    call_command("import_ciat_data", file=str(DATA), dry_run=True, skip_checks=False)  # exécute aussi les contrôles système Django
    assert Project.objects.count() == 0 and Cohort.objects.count() == 0


def test_taxonomy_and_unclassified_projects(imported):
    assert Project.objects.filter(domain__code="tic").count() == 18
    assert Project.objects.filter(domain__code="non-classe", subdomain__isnull=True).count() == 2
    assert not Project.objects.filter(domain__code="automobile").exists()  # aucun projet automobile : rien d'inventé
    assert Project.objects.filter(subdomain__code="TIC-SD-04").count() == 5


def test_status_mapping(imported):
    from collections import Counter

    assert Counter(Project.objects.values_list("status", flat=True)) == {
        "EN_INCUBATION": 9,
        "PROTOTYPAGE": 6,
        "TERMINE": 2,
        "SELECTIONNE": 2,
        "ABANDONNE": 1,
    }


def test_indicators_match_analyst_report(imported, client_for):
    ind = client_for(Role.ANALYST).get("/api/analytics/indicators/").data
    assert ind["ideas_received"] == 20 and ind["porteurs"] == 17
    agg = ind["cohort_aggregates"]
    assert (agg["applicable"], agg["applications"], agg["selections"], agg["selection_rate_pct"]) == (True, 290, 77, 26.6)
    assert ind["average_evaluation_score"] == 15.0
    assert ind["prototypes"] == 8 and ind["projects_selected"] == 19
    # Retard : 13 projets ont retard_jours > 0 dans le jeu ; 12 sont « en cours » (le projet abandonné n'est pas compté ici).
    assert Project.objects.filter(delay_days__gt=0).count() == 13 and ind["late_projects"] == 12


def test_cohort_aggregates_follow_cohort_filter_only(imported, client_for):
    c = client_for(Role.ANALYST)
    one = c.get(f"/api/analytics/indicators/?cohort={Cohort.objects.get(external_id='COH-2024').pk}").data["cohort_aggregates"]
    assert (one["applications"], one["selections"]) == (68, 18)
    other = c.get("/api/analytics/indicators/?status=EN_INCUBATION").data["cohort_aggregates"]
    assert other["applicable"] is False and "ventilées" in other["reason"]  # pas de valeur fabriquée


def test_gender_counts_distinct_porteurs(imported, client_for):
    items = {i["key"]: i["count"] for i in client_for(Role.ANALYST).get("/api/analytics/breakdown/?dimension=gender").data["items"]}
    assert items == {"F": 9, "M": 8}  # 9/17 = 53 % comme dans le rapport


def test_subdomain_breakdown_and_filter(imported, client_for):
    c = client_for(Role.ANALYST)
    items = {i["label"]: i["count"] for i in c.get("/api/analytics/breakdown/?dimension=subdomain").data["items"]}
    assert items["Réseaux, sécurité et IoT"] == 5 and items["Non classé"] == 2
    sub = c.get("/api/analytics/filter-options/").data["subdomains"]
    assert len(sub) == 10
    pk = next(x["id"] for x in sub if x["label"] == "Développement frontend")
    assert c.get(f"/api/analytics/indicators/?subdomain={pk}").data["ideas_received"] == 4


def test_annual_budgets_endpoint(imported, client_for):
    rows = {r["year"]: r for r in client_for(Role.ANALYST).get("/api/analytics/annual-budgets/").data["items"]}
    assert rows[2023]["execution_rate_pct"] == 85.2 and rows[2026]["execution_rate_pct"] == 25.4
    assert sum(r["allocated_xof"] for r in rows.values()) == 88_600_000


def test_reset_demo_removes_only_fictive_rows_not_manual_ones(imported, settings):
    settings.DEBUG = True
    manual = Porteur.objects.create(full_name="Saisie manuelle", gender="F", is_demo=False)
    call_command("seed_demo")  # jeu générique : sera supprimé par --reset-demo
    call_command("import_ciat_data", file=str(DATA), reset_demo=True)
    assert Project.objects.count() == 20 and not Project.objects.filter(title__endswith="(démo)").exists()
    assert Porteur.objects.filter(pk=manual.pk).exists()


def test_invalid_file_is_rejected_before_any_write(tmp_path):
    data = json.loads(DATA.read_text(encoding="utf-8"))
    data["projets"][0]["budget_depense"] = data["projets"][0]["budget_accorde"] + 1
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(CommandError):
        call_command("import_ciat_data", file=str(bad))
    assert Project.objects.count() == 0


def test_project_form_rejects_subdomain_of_other_domain(imported, client_for):
    from apps.projects.models import Domain, Subdomain

    coord = client_for(Role.COORDINATOR)
    p = Project.objects.first()
    auto = Domain.objects.get(code="automobile")
    tic_sub = Subdomain.objects.get(code="TIC-SD-01")
    r = coord.patch(f"/api/projects/{p.pk}/", {"domain": auto.pk, "subdomain": tic_sub.pk}, format="json")
    assert r.status_code == 400 and "subdomain" in r.data["details"]


def test_summary_uses_cohort_aggregates_and_flags_limits(imported, client_for):
    s = client_for(Role.ANALYST).get("/api/analytics/summary/").data
    assert any("Candidatures agrégées : 290, sélections : 77 (26.6 %)" in o for o in s["observations"])
    assert any("projet(s) enregistré(s)" in o for o in s["observations"])
    assert any("agrégats par cohorte" in x for x in s["limits"])
    filtered = client_for(Role.ANALYST).get("/api/analytics/summary/?status=EN_INCUBATION").data
    assert not any("Candidatures agrégées" in o for o in filtered["observations"])
    assert any("ventilées" in x for x in filtered["limits"])
