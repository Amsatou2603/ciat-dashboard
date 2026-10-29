import pytest

from apps.accounts.models import Role
from apps.projects.models import Project

pytestmark = pytest.mark.django_db
BASE = "/api/analytics/"


def get(client_for, path, role=Role.ANALYST):
    return client_for(role).get(BASE + path)


def test_indicators_match_hand_computed_values(client_for, world):
    d = get(client_for, "indicators/").data
    assert d["ideas_received"] == 5
    assert d["projects_selected"] == 4  # A, B, D, E (C rejeté)
    assert d["prototypes"] == 2  # B (PROTOTYPE) + D (MVP) ; E est une maquette -> exclu
    assert d["porteurs"] == 2  # 2 personnes pour 5 projets : pas de confusion projets/porteurs
    assert d["late_projects"] == 1  # A seulement : D terminé, E sans échéance
    assert d["active_projects"] == 3  # A, B, E
    assert d["average_progress_pct"] == pytest.approx((40 + 80 + 20) / 3, abs=0.1)
    assert d["partnerships"] == 2 and d["distinct_partners"] == 1
    assert d["funding_obtained_xof"] == 1_500_000 and d["funding_promised_xof"] == 300_000  # pas de double comptage
    assert d["data_quality"]["active_without_deadline"] == 1


def test_no_double_counting_with_multiple_joins(client_for, world):
    """3 financements + 2 partenariats ne doivent pas multiplier le nombre de projets."""
    assert get(client_for, "indicators/").data["ideas_received"] == Project.objects.count() == 5


def test_empty_selection_has_no_division_by_zero(client_for, world):
    d = get(client_for, "indicators/?period_start=2030-01-01").data
    assert d["ideas_received"] == 0 and d["selection_rate_pct"] is None and d["average_progress_pct"] is None and d["late_rate_pct"] is None
    assert get(client_for, "timeseries/?period_start=2030-01-01").data["items"] == []
    assert get(client_for, "cohorts/?period_start=2030-01-01").data["items"] == []


def test_filters_combine_and_change_results(client_for, world):
    c1, tic = world["c1"].pk, world["tic"].pk
    assert get(client_for, f"indicators/?cohort={c1}").data["ideas_received"] == 2
    assert get(client_for, f"indicators/?cohort={c1}&domain={tic}&status=PROTOTYPAGE").data["ideas_received"] == 1
    assert get(client_for, "indicators/?status=REJETE&status=TERMINE").data["ideas_received"] == 2
    assert get(client_for, "indicators/?period_start=2025-01-01&period_end=2025-12-31").data["ideas_received"] == 3
    assert get(client_for, f"indicators/?porteur={world['p_m'].pk}").data["ideas_received"] == 3


@pytest.mark.parametrize(
    "query", ["period_start=2025-12-31&period_end=2025-01-01", "period_start=pas-une-date", "status=INCONNU", "cohort=abc", "domain=1;DROP"]
)
def test_invalid_filters_return_400(client_for, world, query):
    assert get(client_for, "indicators/?" + query).status_code == 400
    assert client_for(Role.ANALYST).get("/api/projects/?" + query).status_code == 400


def test_empty_filter_values_are_ignored(client_for, world):
    assert get(client_for, "indicators/?cohort=&domain=&status=&period_start=").data["ideas_received"] == 5


def test_filters_update_every_chart_endpoint(client_for, world):
    q = f"?cohort={world['c1'].pk}"
    assert sum(i["count"] for i in get(client_for, "breakdown/" + q + "&dimension=status").data["items"]) == 2
    assert sum(i["count"] for i in get(client_for, "breakdown/" + q + "&dimension=domain").data["items"]) == 2
    assert [c["cohort"] for c in get(client_for, "cohorts/" + q).data["items"]] == ["C1"]
    assert sum(i["ideas"] for i in get(client_for, "timeseries/" + q).data["items"]) == 2


def test_timeseries_fills_empty_months(client_for, world):
    months = [i["month"] for i in get(client_for, "timeseries/").data["items"]]
    assert months == sorted(months) and "2025-03" in months  # mois sans projet présent, à zéro
    assert next(i for i in get(client_for, "timeseries/").data["items"] if i["month"] == "2025-03")["ideas"] == 0


def test_breakdown_dimensions_and_invalid_dimension(client_for, world):
    assert get(client_for, "breakdown/?dimension=domain").data["items"][0]["label"].startswith("TIC")
    gender = {i["key"]: i["count"] for i in get(client_for, "breakdown/?dimension=gender").data["items"]}
    assert gender == {"F": 1, "M": 1}  # porteurs DISTINCTS (2 personnes pour 5 projets)
    assert get(client_for, "breakdown/?dimension=secret").status_code == 400


def test_late_projects_list_and_cohort_comparison(client_for, world):
    late = get(client_for, "late/").data["items"]
    assert [p["title"] for p in late] == ["A"] and late[0]["days_late"] == 10
    coh = {c["cohort"]: c for c in get(client_for, "cohorts/").data["items"]}
    assert coh["C1"]["ideas"] == 2 and coh["C1"]["funding_obtained_xof"] == 1_500_000 and coh["C2"]["selected"] == 2


def test_progress_partnerships_funding_endpoints(client_for, world):
    assert get(client_for, "progress/").data["active_total"] == 3
    assert get(client_for, "partnerships/").data["total"] == 2
    funding = get(client_for, "funding/").data
    assert {s["key"]: s["amount_xof"] for s in funding["by_status"]} == {"OBTENU": 1_500_000, "PROMIS": 300_000}


def test_summary_reports_limits_and_observations(client_for, world):
    s = get(client_for, "summary/").data
    assert any("ni date limite ni retard cumulé" in x for x in s["limits"]) and s["observations"]
    empty = get(client_for, "summary/?period_start=2030-01-01").data
    assert empty["observations"] == [] and any("Aucun projet" in x for x in empty["limits"])


def test_demo_data_is_flagged_in_limits(client_for, world):
    Project.objects.filter(title="A").update(is_demo=True)
    assert any("fictives" in x for x in get(client_for, "summary/").data["limits"])


def test_filter_options_hide_porteurs_from_reader(client_for, world):
    assert client_for(Role.READER).get(BASE + "filter-options/").data["porteurs"] == []
    assert len(client_for(Role.ANALYST).get(BASE + "filter-options/").data["porteurs"]) == 2
