"""Charge un jeu de données FICTIF de démonstration. Réexécutable (idempotent, clés naturelles).

Sécurité : refusé hors DEBUG sauf si ALLOW_DEMO_SEED=true. Les comptes de démonstration ne sont créés qu'avec --with-users
et reçoivent un mot de passe aléatoire affiché une seule fois (ou fourni via --password).
"""

import random
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.partnerships.models import Funding, Partner, Partnership
from apps.projects.models import Cohort, Domain, Porteur, Project
from apps.projects.rules import PROTO_MOCKUP, PROTO_MVP, PROTO_NONE, PROTO_PROTOTYPE, Status
from config.env import env_bool

PREFIXES = [
    "Aminata",
    "Moussa",
    "Fatou",
    "Cheikh",
    "Awa",
    "Ibrahima",
    "Khady",
    "Ousmane",
    "Mariama",
    "Abdoulaye",
    "Ndeye",
    "Pape",
    "Sokhna",
    "Mamadou",
    "Astou",
    "Modou",
    "Rokhaya",
    "Alioune",
]
INITIALS = "ABCDFGHKLMNSTW"
IDEAS = {
    "tic-ia-donnees": [
        "Assistant vocal en wolof",
        "Plateforme de suivi des prix du marché",
        "Détection de fraude Mobile Money",
        "Tableau de bord pour coopératives",
        "Application de covoiturage universitaire",
        "Chatbot d'orientation scolaire",
    ],
    "mecanique": [
        "Décortiqueuse à mil mobile",
        "Banc de test de moteurs de pirogue",
        "Presse à briques en terre compressée",
        "Atelier de maintenance prédictive",
    ],
    "agriculture": [
        "Séchoir solaire à mangues",
        "Capteurs d'humidité du sol à bas coût",
        "Compostage urbain de déchets de marché",
        "Transformation de l'hibiscus en poudre",
        "Serre connectée maraîchère",
    ],
    "energie": [
        "Kit solaire pico pour boutiques",
        "Optimisation énergétique de chambres froides",
        "Biodigesteur familial",
        "Éclairage public autonome",
    ],
    "pharma-biomedical": [
        "Extrait standardisé de plantes locales",
        "Oxymètre connecté abordable",
        "Traçabilité des médicaments par QR",
        "Kit de dépistage rapide",
    ],
    "education": [
        "Plateforme de micro-formations métiers",
        "Atelier d'insertion en soudure",
        "Jeu éducatif de numération",
        "Parcours d'alternance numérique",
    ],
    "services-collectivites": [
        "Gestion des déchets par quartier",
        "Guichet numérique d'état civil",
        "Cartographie des points d'eau",
        "Incubateur de jeunes entrepreneurs",
    ],
}
PARTNERS = [
    ("Partenaire démo — Agro Terra", "ENTREPRISE"),
    ("Partenaire démo — Fonds Innovation Sahel", "FINANCEUR"),
    ("Partenaire démo — Université Partenaire", "ACADEMIQUE"),
    ("Partenaire démo — Agence Numérique", "INSTITUTION"),
    ("Partenaire démo — Association Jeunes Entrepreneurs", "ONG"),
    ("Partenaire démo — Énergies Vertes SA", "ENTREPRISE"),
    ("Partenaire démo — Fondation Avenir", "FINANCEUR"),
]
DEMO_USERS = [("admin_demo", Role.ADMIN), ("coordo_demo", Role.COORDINATOR), ("analyste_demo", Role.ANALYST), ("lecteur_demo", Role.READER)]


class Command(BaseCommand):
    help = "Charge des données synthétiques de démonstration (fictives, idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--with-users", action="store_true", help="Crée aussi 4 comptes de démonstration (un par rôle).")
        parser.add_argument("--password", help="Mot de passe des comptes de démo (sinon aléatoire, affiché une fois).")
        parser.add_argument(
            "--reset", action="store_true", help="Supprime d'abord les données FICTIVES existantes (jamais les autres) puis les recrée."
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        if not settings.DEBUG and not env_bool("ALLOW_DEMO_SEED", False):
            raise CommandError(
                "Refusé : données fictives interdites hors développement (définir ALLOW_DEMO_SEED=true pour une démonstration contrôlée)."
            )
        if opts["reset"]:
            Project.objects.filter(is_demo=True).delete()  # supprime aussi partenariats/financements liés (CASCADE)
            Partner.objects.filter(is_demo=True).delete()
            Porteur.objects.filter(is_demo=True, projects__isnull=True).delete()
            Cohort.objects.filter(name__endswith="(démo)", projects__isnull=True).delete()
            self.stdout.write("Données fictives précédentes supprimées.")
        rng = random.Random(20260901)  # déterministe : mêmes données à chaque exécution
        today = timezone.localdate()
        year = today.year
        cohort_specs = [(f"Cohorte {y}-{y + 1} (démo)", y, 9) for y in (year - 2, year - 1, year)]
        cohorts = []
        for name, y, month in cohort_specs:
            start = today.replace(year=y, month=month, day=1)
            cohort, _ = Cohort.objects.get_or_create(
                name=name, defaults={"year": y, "start_date": start, "end_date": start + timedelta(days=330)}
            )
            cohorts.append(cohort)
        partners = [Partner.objects.get_or_create(name=n, defaults={"kind": k, "is_demo": True})[0] for n, k in PARTNERS]
        porteurs = []
        for i in range(30):
            name = f"{PREFIXES[i % len(PREFIXES)]} {INITIALS[(i * 3) % len(INITIALS)]}. (démo {i + 1:02d})"
            gender = rng.choices(["F", "M", "NS"], weights=[44, 50, 6])[0]
            porteurs.append(Porteur.objects.get_or_create(full_name=name, defaults={"gender": gender, "is_demo": True})[0])
        domains = {d.code: d for d in Domain.objects.all()}
        created = 0
        n = 0
        for code, titles in IDEAS.items():
            for title in titles:
                n += 1
                cohort = cohorts[n % len(cohorts)]
                received = cohort.start_date - timedelta(days=rng.randint(10, 80)) + timedelta(days=rng.randint(0, 200))
                received = min(received, today - timedelta(days=5))
                roll = rng.random()
                status = (
                    Status.REJETE
                    if roll < 0.14
                    else Status.RECU
                    if roll < 0.24
                    else Status.PRESELECTIONNE
                    if roll < 0.34
                    else Status.SELECTIONNE
                    if roll < 0.46
                    else Status.EN_INCUBATION
                    if roll < 0.70
                    else Status.PROTOTYPAGE
                    if roll < 0.84
                    else Status.TERMINE
                    if roll < 0.94
                    else Status.ABANDONNE
                )
                active = status in (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE)
                start = (
                    received + timedelta(days=rng.randint(20, 60))
                    if status in (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE, Status.TERMINE)
                    else None
                )
                deadline = None
                if start:
                    deadline = start + timedelta(days=rng.randint(120, 330))
                    if n % 7 == 0 and active:
                        deadline = None  # certains projets sans échéance (limite de données volontaire)
                progress = {Status.TERMINE: 100, Status.RECU: 0, Status.REJETE: 0, Status.PRESELECTIONNE: rng.randint(0, 10)}.get(status)
                if progress is None:
                    progress = rng.randint(15, 95)
                stage = PROTO_NONE
                if status == Status.PROTOTYPAGE:
                    stage = rng.choice([PROTO_PROTOTYPE, PROTO_MVP])
                elif status == Status.TERMINE:
                    stage = rng.choice([PROTO_PROTOTYPE, PROTO_MVP])
                elif status in (Status.EN_INCUBATION, Status.SELECTIONNE):
                    stage = rng.choice([PROTO_NONE, PROTO_MOCKUP])
                if status == Status.ABANDONNE:
                    progress = rng.randint(5, 40)
                project, was_created = Project.objects.get_or_create(
                    title=f"{title} (démo)",
                    cohort=cohort,
                    defaults={
                        "description": "Projet fictif généré pour la démonstration du tableau de bord.",
                        "domain": domains[code],
                        "porteur": porteurs[(n * 7) % len(porteurs)],
                        "received_date": received,
                        "status": status,
                        "start_date": start,
                        "deadline": deadline,
                        "progress": progress,
                        "prototype_stage": stage,
                        "is_demo": True,
                    },
                )
                if was_created:
                    created += 1
                    for partner in rng.sample(partners, k=rng.randint(0, 2)):
                        Partnership.objects.get_or_create(
                            project=project,
                            partner=partner,
                            nature=rng.choice(["TECHNIQUE", "MENTORAT", "COMMERCIAL", "HEBERGEMENT"]),
                            defaults={"status": rng.choice(["ACTIF", "ACTIF", "DISCUSSION", "TERMINE"]), "start_date": start or received},
                        )
                    if status in (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE, Status.TERMINE) and rng.random() < 0.65:
                        for _ in range(rng.randint(1, 2)):
                            Funding.objects.create(
                                project=project,
                                partner=rng.choice(partners),
                                amount_xof=rng.choice([500_000, 1_000_000, 2_500_000, 4_000_000, 7_500_000]),
                                status=rng.choice(["OBTENU", "OBTENU", "PROMIS"]),
                                date=min(today, (start or received) + timedelta(days=rng.randint(10, 120))),
                            )
        self.stdout.write(
            self.style.SUCCESS(
                f"Données fictives : {created} nouveau(x) projet(s) ({Project.objects.filter(is_demo=True).count()} au total)."
            )
        )
        if opts["with_users"]:
            password = opts["password"] or secrets.token_urlsafe(14)
            for username, role in DEMO_USERS:
                user, was_created = User.objects.get_or_create(
                    username=username, defaults={"role": role, "email": f"{username}@demo.invalid", "is_staff": role == Role.ADMIN}
                )
                if was_created:
                    user.set_password(password)
                    user.save()
                    self.stdout.write(f"Compte créé : {username} ({role})")
            if not opts["password"]:
                self.stdout.write(self.style.WARNING(f"Mot de passe des comptes de démo (affiché une seule fois) : {password}"))
