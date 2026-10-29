from django.conf import settings
from django.db import models
from django.db.models import F, Q

from .rules import PHASE_CHOICES, PROTO_NONE, PROTOTYPE_STAGE_CHOICES, STATUS_CHOICES, Status


class Domain(models.Model):
    code = models.SlugField(max_length=30, unique=True)
    label = models.CharField(max_length=150, unique=True)

    class Meta:
        ordering = ["label"]

    def __str__(self):
        return self.label


class Subdomain(models.Model):
    """Sous-domaines validés par l'équipe (TIC : 6, Automobile : 4). Référentiel inséré par migration."""

    domain = models.ForeignKey(Domain, on_delete=models.PROTECT, related_name="subdomains")
    code = models.CharField(max_length=20, unique=True)
    label = models.CharField(max_length=150)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return self.label


class Cohort(models.Model):
    external_id = models.CharField(max_length=30, unique=True, null=True, blank=True, help_text="Identifiant du jeu de données source")
    name = models.CharField(max_length=80, unique=True)
    year = models.PositiveSmallIntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    # Agrégats de cohorte (candidatures / sélections). NON ventilés par domaine, statut ou période : voir indicateurs.
    applications_count = models.PositiveIntegerField(null=True, blank=True)
    selected_count = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["start_date"]
        constraints = [
            models.CheckConstraint(condition=Q(end_date__gte=F("start_date")), name="cohort_end_after_start"),
            models.CheckConstraint(
                condition=Q(applications_count__isnull=True)
                | Q(selected_count__isnull=True)
                | Q(selected_count__lte=F("applications_count")),
                name="cohort_selected_le_applications",
            ),
        ]

    def __str__(self):
        return self.name


class Porteur(models.Model):
    """Porteur de projet. Données personnelles réduites au strict nécessaire (nom + genre facultatif)."""

    GENDERS = [("F", "Femme"), ("M", "Homme"), ("NS", "Non renseigné")]
    external_id = models.CharField(max_length=30, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=120)
    gender = models.CharField(max_length=2, choices=GENDERS, default="NS")
    is_demo = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name"]
        verbose_name_plural = "porteurs"

    def __str__(self):
        return self.full_name


class Project(models.Model):
    external_id = models.CharField(max_length=30, unique=True, null=True, blank=True, help_text="Identifiant du jeu de données source")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    cohort = models.ForeignKey(Cohort, on_delete=models.PROTECT, related_name="projects")
    domain = models.ForeignKey(Domain, on_delete=models.PROTECT, related_name="projects")
    subdomain = models.ForeignKey(Subdomain, null=True, blank=True, on_delete=models.PROTECT, related_name="projects")
    porteur = models.ForeignKey(Porteur, on_delete=models.PROTECT, related_name="projects")
    received_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=Status.RECU)
    start_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    progress = models.PositiveSmallIntegerField(default=0)
    prototype_stage = models.CharField(max_length=10, choices=PROTOTYPE_STAGE_CHOICES, default=PROTO_NONE)
    prototype_notes = models.TextField(blank=True)
    mentor = models.CharField(max_length=120, blank=True)
    phase = models.CharField(max_length=4, choices=PHASE_CHOICES, blank=True)
    team_size = models.PositiveSmallIntegerField(null=True, blank=True)
    evaluation_score = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True, help_text="Note du comité sur 20")
    delay_days = models.PositiveIntegerField(default=0, help_text="Retard cumulé sur les jalons, en jours")
    budget_requested_xof = models.PositiveBigIntegerField(null=True, blank=True)
    budget_granted_xof = models.PositiveBigIntegerField(null=True, blank=True)
    budget_spent_xof = models.PositiveBigIntegerField(null=True, blank=True)
    is_demo = models.BooleanField(default=False, help_text="Donnée fictive de démonstration")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-received_date", "-id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["received_date"]),
            models.Index(fields=["deadline"]),
            models.Index(fields=["cohort", "domain"]),
            models.Index(fields=["subdomain"]),
        ]
        constraints = [
            models.CheckConstraint(condition=Q(progress__gte=0, progress__lte=100), name="project_progress_0_100"),
            models.CheckConstraint(
                condition=Q(evaluation_score__isnull=True) | Q(evaluation_score__gte=0, evaluation_score__lte=20), name="project_score_0_20"
            ),
            models.CheckConstraint(
                condition=Q(budget_granted_xof__isnull=True)
                | Q(budget_spent_xof__isnull=True)
                | Q(budget_spent_xof__lte=F("budget_granted_xof")),
                name="project_spent_le_granted",
            ),
            models.CheckConstraint(
                condition=Q(deadline__isnull=True) | Q(start_date__isnull=True) | Q(deadline__gte=F("start_date")),
                name="project_deadline_after_start",
            ),
        ]

    def __str__(self):
        return self.title
