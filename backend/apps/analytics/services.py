"""Calculs analytiques (toute la logique chiffrée vit ici, jamais dans le modèle de langage ni dans le frontend).

Chaque fonction reçoit un queryset de projets DÉJÀ filtré (période, cohorte, domaine, statut, porteur) et déjà
autorisé, puis calcule à partir de données persistées. Les partenariats/financements sont interrogés par sous-requête
sur ces projets pour éviter tout double comptage lié aux jointures.
"""

from __future__ import annotations

from collections import OrderedDict
from datetime import date

from dateutil.relativedelta import relativedelta
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import ExtractYear, TruncMonth
from django.utils import timezone

from apps.partnerships.models import AnnualBudget, Funding, Partner, Partnership
from apps.projects.models import Cohort
from apps.projects.rules import (
    ACTIVE_STATUSES,
    PROTOTYPE_STAGE_CHOICES,
    PROTOTYPE_STAGES,
    SELECTED_STATUSES,
    STATUS_CHOICES,
    Status,
    days_late,
    late_q,
)

MAX_MONTHS = 60


def _pct(part: int, whole: int) -> float | None:
    """Pourcentage arrondi ; None (et non 0) quand le dénominateur est nul."""
    return round(100 * part / whole, 1) if whole else None


# Filtres qui rendent les agrégats de cohorte inapplicables (ils ne sont pas ventilés par ces dimensions).
_NON_COHORT_FILTERS = ("period_start", "period_end", "domain", "subdomain", "status", "porteur")


def cohort_aggregates(params=None) -> dict | None:
    """Candidatures / sélections agrégées par cohorte (fournies par le jeu de données, non dérivables des projets).

    `applicable` est faux dès qu'un filtre autre que la cohorte est actif : ces agrégats ne sont pas ventilés par
    période, domaine, statut ou porteur — on ne fabrique donc aucune valeur dans ce cas.
    """
    qs = Cohort.objects.filter(applications_count__isnull=False, selected_count__isnull=False)
    if not qs.exists():
        return None
    get = (lambda k: params.get(k)) if params is not None else (lambda k: None)
    if any(get(k) not in (None, "") for k in _NON_COHORT_FILTERS):
        return {"applicable": False, "reason": "Les candidatures agrégées ne sont pas ventilées par période, domaine, statut ou porteur."}
    if get("cohort") not in (None, ""):
        qs = qs.filter(pk=get("cohort"))
    agg = qs.aggregate(applications=Sum("applications_count"), selections=Sum("selected_count"), cohorts=Count("id"))
    return {
        "applicable": True,
        "applications": agg["applications"] or 0,
        "selections": agg["selections"] or 0,
        "selection_rate_pct": _pct(agg["selections"] or 0, agg["applications"] or 0),
        "cohorts": agg["cohorts"],
    }


def compute_indicators(projects, today: date | None = None, params=None) -> dict:
    today = today or timezone.localdate()
    agg = projects.aggregate(
        ideas=Count("id"),
        selected=Count("id", filter=Q(status__in=SELECTED_STATUSES)),
        prototypes=Count("id", filter=Q(prototype_stage__in=PROTOTYPE_STAGES)),
        porteurs=Count("porteur", distinct=True),
        late=Count("id", filter=late_q(today)),
        active=Count("id", filter=Q(status__in=ACTIVE_STATUSES)),
        avg_progress=Avg("progress", filter=Q(status__in=ACTIVE_STATUSES)),
        completed=Count("id", filter=Q(status=Status.TERMINE)),
        without_deadline=Count("id", filter=Q(status__in=ACTIVE_STATUSES, deadline__isnull=True, delay_days=0)),
        avg_score=Avg("evaluation_score"),
        budget_granted=Sum("budget_granted_xof"),
        budget_spent=Sum("budget_spent_xof"),
        demo=Count("id", filter=Q(is_demo=True)),
    )
    partnerships = Partnership.objects.filter(project__in=projects.values("pk"))
    p_agg = partnerships.aggregate(
        total=Count("id"), partners=Count("partner", distinct=True), active=Count("id", filter=Q(status="ACTIF"))
    )
    fundings = Funding.objects.filter(project__in=projects.values("pk"))
    f_agg = fundings.aggregate(
        count=Count("id"),
        obtained=Sum("amount_xof", filter=Q(status="OBTENU")),
        promised=Sum("amount_xof", filter=Q(status="PROMIS")),
    )
    return {
        "ideas_received": agg["ideas"],
        "projects_selected": agg["selected"],
        "selection_rate_pct": _pct(agg["selected"], agg["ideas"]),
        "prototypes": agg["prototypes"],
        "porteurs": agg["porteurs"],  # nombre de personnes distinctes ≠ nombre de projets
        "active_projects": agg["active"],
        "completed_projects": agg["completed"],
        "average_progress_pct": round(agg["avg_progress"], 1) if agg["avg_progress"] is not None else None,
        "late_projects": agg["late"],
        "late_rate_pct": _pct(agg["late"], agg["active"]),
        "average_evaluation_score": round(float(agg["avg_score"]), 1) if agg["avg_score"] is not None else None,
        "budget_granted_xof": agg["budget_granted"] or 0,
        "budget_spent_xof": agg["budget_spent"] or 0,
        "cohort_aggregates": cohort_aggregates(params),
        "partnerships": p_agg["total"],
        "partnerships_active": p_agg["active"],
        "distinct_partners": p_agg["partners"],
        "funding_count": f_agg["count"],
        "funding_obtained_xof": f_agg["obtained"] or 0,
        "funding_promised_xof": f_agg["promised"] or 0,
        "data_quality": {
            "active_without_deadline": agg["without_deadline"],
            "demo_projects": agg["demo"],
        },
    }


def _month_range(start: date, end: date):
    cursor = start.replace(day=1)
    while cursor <= end:
        yield cursor
        cursor += relativedelta(months=1)


def timeseries(projects) -> list[dict]:
    """Idées reçues et projets sélectionnés par mois de réception (mois vides remplis à zéro)."""
    rows = (
        projects.annotate(m=TruncMonth("received_date"))
        .values("m")
        .annotate(
            ideas=Count("id"),
            selected=Count("id", filter=Q(status__in=SELECTED_STATUSES)),
            prototypes=Count("id", filter=Q(prototype_stage__in=PROTOTYPE_STAGES)),
        )
        .order_by("m")
    )
    by_month = OrderedDict((r["m"], r) for r in rows)
    if not by_month:
        return []
    months = list(_month_range(min(by_month), max(by_month)))[-MAX_MONTHS:]
    return [
        {
            "month": m.strftime("%Y-%m"),
            "ideas": by_month[m]["ideas"] if m in by_month else 0,
            "selected": by_month[m]["selected"] if m in by_month else 0,
            "prototypes": by_month[m]["prototypes"] if m in by_month else 0,
        }
        for m in months
    ]


GENDER_LABELS = {"F": "Femmes", "M": "Hommes", "NS": "Non renseigné"}


def breakdown(projects, dimension: str) -> list[dict]:
    if dimension == "status":
        counts = dict(projects.values_list("status").annotate(n=Count("id")))
        return [{"key": k, "label": label, "count": counts.get(k, 0)} for k, label in STATUS_CHOICES]
    if dimension == "domain":
        rows = projects.values("domain_id", "domain__label").annotate(n=Count("id")).order_by("-n", "domain__label")
        return [{"key": r["domain_id"], "label": r["domain__label"], "count": r["n"]} for r in rows]
    if dimension == "subdomain":
        rows = projects.values("subdomain_id", "subdomain__label").annotate(n=Count("id")).order_by("-n", "subdomain__label")
        return [
            {
                "key": r["subdomain_id"] if r["subdomain_id"] is not None else "none",
                "label": r["subdomain__label"] or "Non classé",
                "count": r["n"],
            }
            for r in rows
        ]
    if dimension == "gender":
        # Compte des PORTEURS DISTINCTS (un porteur ayant plusieurs projets compte une seule fois).
        rows = projects.values("porteur__gender").annotate(n=Count("porteur", distinct=True))
        counts = {r["porteur__gender"]: r["n"] for r in rows}
        return [{"key": k, "label": GENDER_LABELS[k], "count": counts.get(k, 0)} for k in ("F", "M", "NS") if counts.get(k, 0)]
    if dimension == "prototype":
        rows = projects.values("prototype_stage").annotate(n=Count("id"))
        counts = {r["prototype_stage"]: r["n"] for r in rows}
        return [{"key": k, "label": label, "count": counts.get(k, 0)} for k, label in PROTOTYPE_STAGE_CHOICES]
    raise ValueError(dimension)


def cohort_comparison(projects) -> list[dict]:
    today = timezone.localdate()
    rows = (
        projects.values("cohort_id", "cohort__name", "cohort__start_date")
        .annotate(
            ideas=Count("id"),
            selected=Count("id", filter=Q(status__in=SELECTED_STATUSES)),
            prototypes=Count("id", filter=Q(prototype_stage__in=PROTOTYPE_STAGES)),
            avg_progress=Avg("progress", filter=Q(status__in=ACTIVE_STATUSES)),
            late=Count("id", filter=late_q(today)),
        )
        .order_by("cohort__start_date")
    )
    funding = {
        r["project__cohort_id"]: r["total"]
        for r in Funding.objects.filter(project__in=projects.values("pk"), status="OBTENU")
        .values("project__cohort_id")
        .annotate(total=Sum("amount_xof"))
    }
    return [
        {
            "cohort_id": r["cohort_id"],
            "cohort": r["cohort__name"],
            "ideas": r["ideas"],
            "selected": r["selected"],
            "prototypes": r["prototypes"],
            "average_progress_pct": round(r["avg_progress"], 1) if r["avg_progress"] is not None else None,
            "late": r["late"],
            "funding_obtained_xof": funding.get(r["cohort_id"], 0),
        }
        for r in rows
    ]


def progress_overview(projects, limit: int = 12) -> dict:
    active = projects.filter(status__in=ACTIVE_STATUSES)
    buckets = [("0–25 %", 0, 25), ("26–50 %", 26, 50), ("51–75 %", 51, 75), ("76–99 %", 76, 99), ("100 %", 100, 100)]
    dist = [{"label": label, "count": active.filter(progress__gte=lo, progress__lte=hi).count()} for label, lo, hi in buckets]
    items = [
        {"id": p.pk, "title": p.title, "progress": p.progress, "status": p.status, "deadline": p.deadline, "cohort": p.cohort.name}
        for p in active.select_related("cohort").order_by("progress", "title")[:limit]
    ]
    return {"distribution": dist, "lowest_progress": items, "active_total": active.count()}


def late_projects(projects, limit: int = 50) -> list[dict]:
    today = timezone.localdate()
    qs = projects.filter(late_q(today)).select_related("cohort", "domain").order_by("deadline", "title")[:limit]
    return [
        {
            "id": p.pk,
            "title": p.title,
            "cohort": p.cohort.name,
            "domain": p.domain.label,
            "status": p.status,
            "progress": p.progress,
            "deadline": p.deadline,
            "days_late": days_late(p, today),
        }
        for p in qs
    ]


def partnerships_overview(projects) -> dict:
    qs = Partnership.objects.filter(project__in=projects.values("pk"))
    by_nature = [
        {"key": r["nature"], "label": dict(Partnership.NATURES)[r["nature"]], "count": r["n"]}
        for r in qs.values("nature").annotate(n=Count("id")).order_by("-n")
    ]
    by_kind = [
        {"key": r["partner__kind"], "label": dict(Partner.KINDS)[r["partner__kind"]], "count": r["n"]}
        for r in qs.values("partner__kind").annotate(n=Count("id")).order_by("-n")
    ]
    top = [
        {"partner": r["partner__name"], "count": r["n"]}
        for r in qs.values("partner__name").annotate(n=Count("id")).order_by("-n", "partner__name")[:8]
    ]
    return {"by_nature": by_nature, "by_partner_kind": by_kind, "top_partners": top, "total": qs.count()}


def funding_overview(projects) -> dict:
    qs = Funding.objects.filter(project__in=projects.values("pk"))
    by_status = [
        {"key": r["status"], "label": dict(Funding.STATUSES)[r["status"]], "amount_xof": r["t"], "count": r["n"]}
        for r in qs.values("status").annotate(t=Sum("amount_xof"), n=Count("id"))
    ]
    by_partner = [
        {"partner": r["partner__name"], "amount_xof": r["t"]}
        for r in qs.values("partner__name").annotate(t=Sum("amount_xof")).order_by("-t")[:8]
    ]
    by_year = [
        {"year": r["y"], "obtained_xof": r["o"] or 0, "promised_xof": r["p"] or 0}
        for r in qs.values(y=ExtractYear("date"))
        .annotate(o=Sum("amount_xof", filter=Q(status="OBTENU")), p=Sum("amount_xof", filter=Q(status="PROMIS")))
        .order_by("y")
    ]
    return {"by_status": by_status, "by_partner": by_partner, "by_year": by_year, "count": qs.count()}


def annual_budgets() -> list[dict]:
    """Enveloppes annuelles du CIAT (agrégats du jeu de données, indépendants des filtres de projets)."""
    out = []
    for b in AnnualBudget.objects.all():
        out.append(
            {
                "year": b.year,
                "allocated_xof": b.allocated_xof,
                "spent_xof": b.spent_xof,
                "execution_rate_pct": _pct(b.spent_xof, b.allocated_xof),
                "sources": b.sources,
                "is_demo": b.is_demo,
            }
        )
    return out


def _period_label(params) -> str:
    start, end = params.get("period_start"), params.get("period_end")
    if start and end:
        return f"du {start} au {end}"
    if start:
        return f"à partir du {start}"
    if end:
        return f"jusqu'au {end}"
    return "toutes périodes"


def summary(projects, params, can_see_gender: bool) -> dict:
    """Fiche de synthèse : chiffres + observations produites par des règles déterministes (pas par une IA)."""
    ind = compute_indicators(projects, params=params)
    dom = breakdown(projects, "domain")
    coh = cohort_comparison(projects)
    late = late_projects(projects, limit=5)
    ts = timeseries(projects)

    trend = None
    if len(ts) >= 2:
        last, prev = ts[-1], ts[-2]
        trend = {
            "last_month": last["month"],
            "ideas_last": last["ideas"],
            "ideas_previous": prev["ideas"],
            "delta": last["ideas"] - prev["ideas"],
        }

    limits, observations = [], []
    if ind["ideas_received"] == 0:
        limits.append("Aucun projet ne correspond aux filtres : aucune observation chiffrée n'est possible.")
    q = ind["data_quality"]
    if q["demo_projects"]:
        limits.append(f"{q['demo_projects']} projet(s) sont des données fictives de démonstration, non des données officielles du CIAT.")
    if q["active_without_deadline"]:
        limits.append(
            f"{q['active_without_deadline']} projet(s) en cours n'ont ni date limite ni retard cumulé enregistré : leur retard n'est pas évaluable (ou nul)."
        )
    if ind["funding_count"] == 0 and ind["ideas_received"]:
        limits.append("Aucun financement n'est enregistré pour cette sélection.")
    if can_see_gender:
        unknown = projects.filter(porteur__gender="NS").count()
        if unknown:
            limits.append(f"Le genre n'est pas renseigné pour {unknown} projet(s) ; la répartition par genre est partielle.")
    limits.append("Les « projets sélectionnés » excluent les projets abandonnés (hypothèse provisoire à valider avec le CIAT).")

    agg = ind["cohort_aggregates"]
    if agg and agg["applicable"]:
        observations.append(
            f"Candidatures agrégées : {agg['applications']}, sélections : {agg['selections']} ({agg['selection_rate_pct']} %)."
        )
        limits.append(
            "Candidatures et sélections sont des agrégats par cohorte ; les analyses par projet portent sur les projets détaillés enregistrés."
        )
    elif agg:
        limits.append(agg["reason"])
    if ind["ideas_received"]:
        label = "projet(s) enregistré(s)" if agg and agg["applicable"] else "idée(s) reçue(s)"
        observations.append(
            f"{ind['ideas_received']} {label}, dont {ind['projects_selected']} sélectionné(s)"
            + (f" ({ind['selection_rate_pct']} %)." if ind["selection_rate_pct"] is not None else ".")
        )
    if ind["late_projects"]:
        observations.append(
            f"{ind['late_projects']} projet(s) en retard"
            + (f" sur {ind['active_projects']} en cours ({ind['late_rate_pct']} %)." if ind["late_rate_pct"] is not None else ".")
        )
    elif ind["active_projects"]:
        observations.append("Aucun projet en cours n'est en retard.")
    if dom:
        observations.append(f"Domaine le plus représenté : {dom[0]['label']} ({dom[0]['count']} projet(s)).")
    if coh:
        top = max(coh, key=lambda c: c["ideas"])
        observations.append(f"Cohorte la plus représentée : {top['cohort']} ({top['ideas']} projet(s)).")
    if trend and trend["delta"]:
        sens = "hausse" if trend["delta"] > 0 else "baisse"
        observations.append(f"Idées reçues en {sens} de {abs(trend['delta'])} entre {ts[-2]['month']} et {trend['last_month']}.")

    return {
        "period": _period_label(params),
        "indicators": ind,
        "top_domains": dom[:3],
        "cohorts": coh,
        "late_projects": late,
        "trend": trend,
        "observations": observations,
        "limits": limits,
    }
