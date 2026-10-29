"""Référentiel des 7 domaines d'application prioritaires cités dans le document d'évaluation (donnée de référence, pas de démo)."""
from django.db import migrations

DOMAINS = [
    ("tic-ia-donnees", "TIC, numérique, intelligence artificielle et données"),
    ("mecanique", "Mécanique, fabrication et maintenance"),
    ("agriculture", "Agriculture, transformation et environnement"),
    ("energie", "Énergie, efficacité énergétique et énergies renouvelables"),
    ("pharma-biomedical", "Pharmaceutique et biomédical"),
    ("education", "Éducation, formation professionnelle et insertion"),
    ("services-collectivites", "Services aux collectivités, entrepreneuriat et incubation"),
]


def seed(apps, schema_editor):
    Domain = apps.get_model("projects", "Domain")
    for code, label in DOMAINS:
        Domain.objects.get_or_create(code=code, defaults={"label": label})


class Migration(migrations.Migration):
    dependencies = [("projects", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
