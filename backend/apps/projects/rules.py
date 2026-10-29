"""Règles métier des indicateurs — source unique (documentées dans docs/architecture.md, §Indicateurs)."""

from django.db.models import Q


class Status:
    RECU = "RECU"
    PRESELECTIONNE = "PRESELECTIONNE"
    SELECTIONNE = "SELECTIONNE"
    EN_INCUBATION = "EN_INCUBATION"
    PROTOTYPAGE = "PROTOTYPAGE"
    TERMINE = "TERMINE"
    ABANDONNE = "ABANDONNE"
    REJETE = "REJETE"


STATUS_CHOICES = [
    (Status.RECU, "Idée reçue"),
    (Status.PRESELECTIONNE, "Présélectionné"),
    (Status.SELECTIONNE, "Sélectionné"),
    (Status.EN_INCUBATION, "En incubation"),
    (Status.PROTOTYPAGE, "En prototypage"),
    (Status.TERMINE, "Terminé"),
    (Status.ABANDONNE, "Abandonné"),
    (Status.REJETE, "Non retenu"),
]

# Un projet est « sélectionné » dès qu'il a franchi la sélection et ne l'a pas quittée.
# Hypothèse provisoire : un projet « Abandonné » n'est pas compté (on ignore à quelle étape il a été abandonné).
SELECTED_STATUSES = (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE, Status.TERMINE)
# Projets dont la progression et les échéances ont un sens (en cours de réalisation).
ACTIVE_STATUSES = (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE)

PROTO_NONE, PROTO_MOCKUP, PROTO_PROTOTYPE, PROTO_MVP = "AUCUN", "MAQUETTE", "PROTOTYPE", "MVP"
PROTOTYPE_STAGE_CHOICES = [
    (PROTO_NONE, "Aucun"),
    (PROTO_MOCKUP, "Maquette"),
    (PROTO_PROTOTYPE, "Prototype fonctionnel"),
    (PROTO_MVP, "Produit minimum viable"),
]
# Un « prototype » est un stade fonctionnel ou plus avancé ; une maquette n'en est pas un.
PROTOTYPE_STAGES = (PROTO_PROTOTYPE, PROTO_MVP)

PHASE_CHOICES = [("PRE", "Pré-incubation"), ("INC", "Incubation"), ("POST", "Post-incubation")]


def late_q(today) -> Q:
    """Projet en retard : en cours, progression < 100 %, ET (échéance dépassée OU retard cumulé enregistré > 0 jour).

    Le « retard cumulé » (`delay_days`) vient du suivi des jalons (jeu de données du data analyst). Un projet sans échéance
    et sans retard cumulé n'est jamais compté en retard : il est signalé comme « non évaluable » dans les limites.
    """
    overdue = Q(deadline__isnull=False, deadline__lt=today)
    return Q(status__in=ACTIVE_STATUSES, progress__lt=100) & (overdue | Q(delay_days__gt=0))


def days_late(project, today) -> int | None:
    if project.status not in ACTIVE_STATUSES or project.progress >= 100:
        return None
    overdue = (today - project.deadline).days if project.deadline and project.deadline < today else 0
    days = max(overdue, project.delay_days or 0)
    return days if days > 0 else None
