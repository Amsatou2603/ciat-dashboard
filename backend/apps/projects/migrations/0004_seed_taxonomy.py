"""Taxonomie validée par l'équipe : domaines TIC et Automobile, dix sous-domaines, et un domaine « Non classé » pour les
projets dont le classement n'est pas encore confirmé. Les 7 domaines du sujet restent en base (rien n'est supprimé)."""
from django.db import migrations

DOMAINS = [("tic", "TIC"), ("automobile", "Automobile"), ("non-classe", "Non classé")]
SUBDOMAINS = [
    ("tic", "TIC-SD-01", "Analyse des performances digitales"),
    ("tic", "TIC-SD-02", "Administration de bases de données"),
    ("tic", "TIC-SD-03", "Administration systèmes, sécurité et cloud"),
    ("tic", "TIC-SD-04", "Réseaux, sécurité et IoT"),
    ("tic", "TIC-SD-05", "Développement backend"),
    ("tic", "TIC-SD-06", "Développement frontend"),
    ("automobile", "AUTO-SD-01", "Électromécanique automobile"),
    ("automobile", "AUTO-SD-02", "Carrosserie et peinture"),
    ("automobile", "AUTO-SD-03", "Froid et climatisation automobile"),
    ("automobile", "AUTO-SD-04", "Électromécanique et électronique automobile"),
]


def seed(apps, schema_editor):
    Domain, Subdomain = apps.get_model("projects", "Domain"), apps.get_model("projects", "Subdomain")
    for code, label in DOMAINS:
        Domain.objects.get_or_create(code=code, defaults={"label": label})
    for domain_code, code, label in SUBDOMAINS:
        Subdomain.objects.get_or_create(code=code, defaults={"label": label, "domain": Domain.objects.get(code=domain_code)})


class Migration(migrations.Migration):
    dependencies = [("projects", "0003_subdomain_cohort_applications_count_and_more")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
