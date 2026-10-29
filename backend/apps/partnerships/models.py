from django.db import models
from django.db.models import Q

from apps.projects.models import Project


class Partner(models.Model):
    KINDS = [
        ("ACADEMIQUE", "Établissement académique"),
        ("ENTREPRISE", "Entreprise"),
        ("INSTITUTION", "Institution publique"),
        ("FINANCEUR", "Bailleur / financeur"),
        ("ONG", "ONG / association"),
        ("INTERNATIONAL", "Organisation internationale"),
        ("GOUVERNEMENTAL", "Organisme gouvernemental"),
        ("PROFESSIONNEL", "Organisation professionnelle"),
        ("RECHERCHE", "Recherche"),
        ("NON_PRECISE", "Type non précisé"),
    ]
    name = models.CharField(max_length=150, unique=True)
    kind = models.CharField(max_length=15, choices=KINDS)
    specialty = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_demo = models.BooleanField(default=False)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Partnership(models.Model):
    NATURES = [
        ("TECHNIQUE", "Appui technique"),
        ("MENTORAT", "Mentorat"),
        ("COMMERCIAL", "Débouché commercial"),
        ("HEBERGEMENT", "Hébergement / équipement"),
        ("FINANCIER", "Appui financier"),
        ("AUTRE", "Nature non précisée"),
    ]
    STATUSES = [("ACTIF", "Actif"), ("DISCUSSION", "En discussion"), ("TERMINE", "Terminé")]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="partnerships")
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="partnerships")
    nature = models.CharField(max_length=15, choices=NATURES)
    status = models.CharField(max_length=12, choices=STATUSES, default="ACTIF")
    start_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["project", "partner", "nature"], name="uniq_partnership")]
        indexes = [models.Index(fields=["project"])]


class Funding(models.Model):
    STATUSES = [("PROMIS", "Promis"), ("OBTENU", "Obtenu")]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="fundings")
    partner = models.ForeignKey(Partner, on_delete=models.PROTECT, related_name="fundings")
    amount_xof = models.PositiveBigIntegerField(help_text="Montant en francs CFA (XOF)")
    status = models.CharField(max_length=7, choices=STATUSES, default="PROMIS")
    date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [models.CheckConstraint(condition=Q(amount_xof__gt=0), name="funding_amount_positive")]
        indexes = [models.Index(fields=["project", "status"])]


class AnnualBudget(models.Model):
    """Enveloppe annuelle du CIAT avec ventilation par source (agrégat : non rattaché à des projets)."""

    year = models.PositiveSmallIntegerField(unique=True)
    allocated_xof = models.PositiveBigIntegerField()
    spent_xof = models.PositiveBigIntegerField()
    sources = models.JSONField(default=dict, help_text="Montants par source (ISEP, Partenaires, …)")
    is_demo = models.BooleanField(default=False)

    class Meta:
        ordering = ["year"]
        constraints = [models.CheckConstraint(condition=Q(spent_xof__lte=models.F("allocated_xof")), name="annual_spent_le_allocated")]
