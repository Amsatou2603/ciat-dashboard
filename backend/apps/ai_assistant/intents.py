"""Interprétation des questions : le backend choisit une fonction analytique PRÉDÉFINIE (jamais de SQL libre)."""

from __future__ import annotations

import re
import unicodedata

from apps.analytics import services

CAPABILITIES_HELP = (
    "Je peux répondre sur : le nombre d'idées et de projets sélectionnés, les projets en retard, le domaine le plus "
    "représenté, la comparaison des cohortes, les financements, les partenariats, les prototypes, la répartition par genre "
    "et la synthèse de la période sélectionnée."
)


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in text if not unicodedata.combining(c))


# Ordre = priorité. Chaque règle : (intent, motifs regex sur le texte normalisé).
RULES: list[tuple[str, tuple[str, ...]]] = [
    ("summary", (r"resum", r"synthese", r"situation", r"bilan")),
    ("cohorts", (r"cohorte",)),
    ("late", (r"retard",)),
    ("top_domain", (r"domaine",)),
    ("funding", (r"financ", r"montant", r"fonds", r"subvention")),
    ("partnerships", (r"partenar",)),
    ("prototypes", (r"prototyp",)),
    ("gender", (r"genre", r"femme", r"homme", r"parite")),
    ("counts", (r"combien", r"nombre", r"idees?", r"selection", r"projets?")),
]


def detect_intent(question: str) -> str:
    q = normalize(question)
    for intent, patterns in RULES:
        if any(re.search(p, q) for p in patterns):
            return intent
    return "unsupported"


def _xof(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " XOF"


def run_intent(intent: str, projects, params, can_see_gender: bool) -> tuple[dict, str]:
    """Retourne (données contrôlées transmises au modèle, réponse factuelle déterministe)."""
    ind = services.compute_indicators(projects, params=params)
    if intent == "counts":
        data = {k: ind[k] for k in ("ideas_received", "projects_selected", "selection_rate_pct", "porteurs", "active_projects")}
        text = f"{ind['ideas_received']} idée(s) reçue(s), dont {ind['projects_selected']} projet(s) sélectionné(s) (porteurs distincts : {ind['porteurs']})."
        agg = ind["cohort_aggregates"]
        if agg and agg["applicable"]:
            data["cohort_aggregates"] = agg
            text += f" Agrégats de cohorte : {agg['applications']} candidature(s), {agg['selections']} sélection(s) ({agg['selection_rate_pct']} %)."
        if ind["ideas_received"] == 0:
            text = "Aucun projet ne correspond aux filtres actuels."
        return data, text
    if intent == "late":
        late = services.late_projects(projects, limit=5)
        data = {
            "late_projects": ind["late_projects"],
            "active_projects": ind["active_projects"],
            "late_rate_pct": ind["late_rate_pct"],
            "examples": [{"title": p["title"][:80], "days_late": p["days_late"], "cohort": p["cohort"]} for p in late],
        }
        text = f"{ind['late_projects']} projet(s) en retard sur {ind['active_projects']} projet(s) en cours."
        if ind["active_projects"] == 0:
            text = "Aucun projet en cours dans la sélection : le calcul des retards n'est pas applicable."
        if ind["data_quality"]["active_without_deadline"]:
            text += f" Attention : {ind['data_quality']['active_without_deadline']} projet(s) en cours n'ont pas de date limite et ne sont pas comptés."
        return data, text
    if intent == "top_domain":
        dom = services.breakdown(projects, "domain")
        data = {"domains": [{"label": d["label"], "count": d["count"]} for d in dom[:5]]}
        text = (
            f"Domaine le plus représenté : {dom[0]['label']} ({dom[0]['count']} projet(s))."
            if dom
            else "Aucune donnée de domaine pour cette sélection."
        )
        if len(dom) > 1 and dom[0]["count"] == dom[1]["count"]:
            text += f" Égalité avec {dom[1]['label']}."
        return data, text
    if intent == "cohorts":
        coh = services.cohort_comparison(projects)[-2:]
        data = {"cohorts": coh}
        if len(coh) < 2:
            return data, "Moins de deux cohortes dans la sélection : la comparaison n'est pas possible."
        a, b = coh
        text = (
            f"{a['cohort']} : {a['ideas']} idées, {a['selected']} sélectionnés, {a['prototypes']} prototypes. "
            f"{b['cohort']} : {b['ideas']} idées, {b['selected']} sélectionnés, {b['prototypes']} prototypes."
        )
        return data, text
    if intent == "funding":
        data = {k: ind[k] for k in ("funding_obtained_xof", "funding_promised_xof", "funding_count")}
        if ind["funding_count"] == 0:
            return data, "Aucun financement n'est enregistré pour cette sélection."
        return data, (
            f"Financements obtenus : {_xof(ind['funding_obtained_xof'])} ; promis (non encore obtenus) : "
            f"{_xof(ind['funding_promised_xof'])} ({ind['funding_count']} ligne(s) de financement)."
        )
    if intent == "partnerships":
        ov = services.partnerships_overview(projects)
        data = {
            "total": ov["total"],
            "active": ind["partnerships_active"],
            "distinct_partners": ind["distinct_partners"],
            "by_nature": ov["by_nature"],
        }
        return data, (
            f"{ov['total']} partenariat(s) enregistré(s), dont {ind['partnerships_active']} actif(s), avec {ind['distinct_partners']} partenaire(s) distinct(s)."
            if ov["total"]
            else "Aucun partenariat enregistré pour cette sélection."
        )
    if intent == "prototypes":
        data = {"prototypes": ind["prototypes"], "ideas_received": ind["ideas_received"]}
        return data, f"{ind['prototypes']} projet(s) au stade prototype fonctionnel ou MVP (les maquettes ne sont pas comptées)."
    if intent == "gender":
        if not can_see_gender:
            return {}, "La répartition par genre n'est pas accessible avec votre rôle."
        g = services.breakdown(projects, "gender")
        data = {"gender": g}
        return data, (
            "Répartition des projets selon le genre du porteur : " + ", ".join(f"{x['label']} {x['count']}" for x in g) + "."
        ) if g else "Aucune donnée de genre."
    if intent == "summary":
        s = services.summary(projects, params, can_see_gender)
        data = {
            "period": s["period"],
            "indicators": {k: v for k, v in s["indicators"].items() if k != "data_quality"},
            "observations": s["observations"],
            "limits": s["limits"],
        }
        return data, " ".join(s["observations"]) or "Aucune donnée à résumer pour cette sélection."
    return {}, "Je ne peux pas répondre à cette question avec les fonctions analytiques disponibles. " + CAPABILITIES_HELP
