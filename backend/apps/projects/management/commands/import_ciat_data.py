"""Importe le jeu de données du data analyst (`data/donnees_ciat.json`) dans la base. Idempotent (clés `external_id`).

Décisions de correspondance (à valider avec le data analyst — voir docs/data_integration.md) :
- Les données restent marquées FICTIVES / SIMULÉES (`is_demo=True`) : le fichier se déclare lui-même « jeu de données simulé ».
  `--officiel` les marque comme réelles : à n'utiliser que si le CIAT a validé que ce sont des données officielles.
- Données personnelles minimisées : seuls le nom complet et le genre des porteurs sont importés (pas d'e-mail, téléphone,
  âge ni formation).
- Aucune donnée n'est inventée : champs absents = vides (NULL), jamais complétés.
"""

import json
from datetime import date
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.partnerships.models import AnnualBudget, Funding, Partner, Partnership
from apps.projects.models import Cohort, Domain, Porteur, Project, Subdomain
from apps.projects.rules import PROTO_MVP, PROTO_NONE, PROTO_PROTOTYPE, Status

STATUS_MAP = {
    "Idée": Status.SELECTIONNE,  # tous les projets détaillés ont une date de sélection : sélectionnés, pas encore incubés
    "En cours": Status.EN_INCUBATION,
    "Prototype validé": Status.PROTOTYPAGE,
    "Déployé": Status.TERMINE,
    "Abandonné": Status.ABANDONNE,
}
STAGE_MAP = {"Prototype validé": PROTO_PROTOTYPE, "Déployé": PROTO_MVP}
PHASE_MAP = {"Pré-incubation": "PRE", "Incubation": "INC", "Post-incubation": "POST"}
DOMAIN_MAP = {"DOM-TIC": "tic", "DOM-AUTO": "automobile", None: "non-classe"}
PARTNER_KIND = {
    "Institutionnel": "INSTITUTION",
    "International": "INTERNATIONAL",
    "Gouvernemental": "GOUVERNEMENTAL",
    "Entreprise": "ENTREPRISE",
    "Professionnel": "PROFESSIONNEL",
    "Recherche": "RECHERCHE",
}
FUNDER_NAME = "CIAT — budget accordé aux projets"
ACTIVE = (Status.SELECTIONNE, Status.EN_INCUBATION, Status.PROTOTYPAGE)
REQUIRED = ["cohortes", "domaines", "porteurs_projets", "projets", "financements", "partenariats"]


def iso(value):
    return date.fromisoformat(value) if value else None


class Command(BaseCommand):
    help = "Importe le jeu de données du data analyst (JSON). Réexécutable sans doublons."

    def add_arguments(self, parser):
        parser.add_argument("--file", default=str(Path(__file__).resolve().parents[5] / "data" / "donnees_ciat.json"))
        parser.add_argument("--dry-run", action="store_true", help="Valide et simule : n'écrit rien.")
        parser.add_argument(
            "--reset-demo",
            action="store_true",
            help="Supprime d'abord les données fictives existantes (is_demo=True), dont le jeu générique de seed_demo.",
        )
        parser.add_argument(
            "--officiel",
            action="store_true",
            help="Marque les données comme RÉELLES (is_demo=False). À n'utiliser qu'avec validation du CIAT.",
        )

    def handle(self, *args, **opts):
        path = Path(opts["file"])
        if not path.is_file():
            raise CommandError(f"Fichier introuvable : {path}")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"JSON invalide : {exc}") from exc
        self.validate_payload(data)
        demo = not opts["officiel"]
        with transaction.atomic():
            if opts["reset_demo"]:
                self.reset()
            stats = self.load(data, demo)
            if opts["dry_run"]:
                transaction.set_rollback(True)
        prefix = "SIMULATION (rien n'a été écrit) — " if opts["dry_run"] else ""
        self.stdout.write(self.style.SUCCESS(prefix + ", ".join(f"{v} {k}" for k, v in stats.items())))
        if demo:
            self.stdout.write("Données marquées fictives/simulées (is_demo=True), conformément au fichier source.")

    # ------------------------------------------------------------------ validation (avant toute écriture)
    def validate_payload(self, data):
        issues = [f"collection absente : {k}" for k in REQUIRED if not isinstance(data.get(k), list)]
        if issues:
            raise CommandError("Fichier non conforme : " + " ; ".join(issues))
        cohorts = {c["id"] for c in data["cohortes"]}
        owners = {p["id"] for p in data["porteurs_projets"]}
        domains = {d["id"]: {s["id"] for s in d["sous_domaines"]} for d in data["domaines"]}
        known_sub = set(Subdomain.objects.values_list("code", flat=True))
        for p in data["projets"]:
            pid = p.get("id", "?")
            if p.get("cohorte_id") not in cohorts:
                issues.append(f"{pid}: cohorte inconnue")
            if p.get("porteur_id") not in owners:
                issues.append(f"{pid}: porteur inconnu")
            if p.get("statut") not in STATUS_MAP:
                issues.append(f"{pid}: statut inconnu {p.get('statut')!r}")
            if p.get("domaine_id") not in DOMAIN_MAP:
                issues.append(f"{pid}: domaine inconnu {p.get('domaine_id')!r}")
            sub = p.get("sous_domaine_id")
            if sub is not None and (sub not in domains.get(p.get("domaine_id"), set()) or sub not in known_sub):
                issues.append(f"{pid}: sous-domaine incohérent {sub!r}")
            if not (p["budget_depense"] <= p["budget_accorde"] <= p["budget_demande"]):
                issues.append(f"{pid}: budgets incohérents")
        for f in data["financements"]:
            if sum(f["sources"].values()) != f["budget_total_alloue"]:
                issues.append(f"financement {f['annee']}: somme des sources ≠ budget alloué")
        if issues:
            raise CommandError("Données invalides, import annulé : " + " ; ".join(issues))

    # ------------------------------------------------------------------ nettoyage ciblé
    def reset(self):
        """Ne supprime QUE les lignes marquées fictives ; jamais de données saisies à la main (is_demo=False)."""
        Project.objects.filter(is_demo=True).delete()  # partenariats et financements liés : CASCADE
        Partner.objects.filter(is_demo=True).delete()
        AnnualBudget.objects.filter(is_demo=True).delete()
        Porteur.objects.filter(is_demo=True, projects__isnull=True).delete()
        Cohort.objects.filter(projects__isnull=True, name__endswith="(démo)").delete()
        # Domaines génériques du sujet devenus inutilisés : retirés (PROTECT empêche de supprimer un domaine utilisé).
        legacy = ["tic-ia-donnees", "mecanique", "agriculture", "energie", "pharma-biomedical", "education", "services-collectivites"]
        Domain.objects.filter(code__in=legacy, projects__isnull=True).delete()
        self.stdout.write("Données fictives précédentes supprimées.")

    # ------------------------------------------------------------------ chargement
    def load(self, data, demo):
        stats = {"cohortes": 0, "porteurs": 0, "projets": 0, "partenaires": 0, "partenariats": 0, "financements": 0, "budgets annuels": 0}
        cohorts = {}
        for c in data["cohortes"]:
            obj, _ = Cohort.objects.update_or_create(
                external_id=c["id"],
                defaults={
                    "name": c["nom"],
                    "year": c["annee"],
                    "start_date": iso(c["date_debut"]),
                    "end_date": iso(c["date_fin"]),
                    "applications_count": c["nb_candidatures"],
                    "selected_count": c["nb_selectionnes"],
                },
            )
            cohorts[c["id"]] = obj
            stats["cohortes"] += 1
        owners = {}
        for p in data["porteurs_projets"]:
            obj, _ = Porteur.objects.update_or_create(
                external_id=p["id"], defaults={"full_name": f"{p['prenom']} {p['nom']}", "gender": p["genre"], "is_demo": demo}
            )
            owners[p["id"]] = obj
            stats["porteurs"] += 1
        domains = {d.code: d for d in Domain.objects.all()}
        subs = {s.code: s for s in Subdomain.objects.all()}

        partners = {}
        for r in data["partenariats"]:
            obj, _ = Partner.objects.update_or_create(
                name=r["partenaire"],
                defaults={
                    "kind": PARTNER_KIND[r["type"]],
                    "specialty": r["specialite"],
                    "start_date": iso(r["date_debut"]),
                    "is_active": r["actif"],
                    "is_demo": demo,
                },
            )
            partners[r["partenaire"]] = obj
            stats["partenaires"] += 1
        funder, _ = Partner.objects.update_or_create(
            name=FUNDER_NAME, defaults={"kind": "INSTITUTION", "specialty": "Budget du CIAT", "is_demo": demo}
        )

        for pr in data["projets"]:
            status = STATUS_MAP[pr["statut"]]
            project, _ = Project.objects.update_or_create(
                external_id=pr["id"],
                defaults={
                    "title": pr["titre"],
                    "description": pr["description"],
                    "cohort": cohorts[pr["cohorte_id"]],
                    "porteur": owners[pr["porteur_id"]],
                    "domain": domains[DOMAIN_MAP[pr["domaine_id"]]],
                    "subdomain": subs.get(pr["sous_domaine_id"]) if pr["sous_domaine_id"] else None,
                    "received_date": iso(pr["date_soumission"]),
                    "start_date": iso(pr["date_selection"]),  # début = sélection (hypothèse documentée)
                    "deadline": None,  # le jeu fournit un retard cumulé (delay_days), pas d'échéance : on n'en invente pas
                    "status": status,
                    "progress": pr["progression"],
                    "prototype_stage": STAGE_MAP.get(pr["statut"], PROTO_NONE),
                    "mentor": pr.get("mentor", ""),
                    "phase": PHASE_MAP.get(pr.get("phase", ""), ""),
                    "team_size": pr.get("nb_membres_equipe"),
                    "evaluation_score": pr.get("note_evaluation"),
                    "delay_days": pr["retard_jours"],
                    "budget_requested_xof": pr["budget_demande"],
                    "budget_granted_xof": pr["budget_accorde"],
                    "budget_spent_xof": pr["budget_depense"],
                    "is_demo": demo,
                },
            )
            stats["projets"] += 1
            link_status = "ACTIF" if status in ACTIVE else "TERMINE"  # dérivé : le jeu ne précise pas le statut du lien projet↔partenaire
            for name in pr["partenaires"]:
                partner = partners.get(name)
                if partner is None:  # nom cité par un projet mais absent du registre : créé « type non précisé », sans rien inventer
                    partner, _ = Partner.objects.get_or_create(name=name, defaults={"kind": "NON_PRECISE", "is_demo": demo})
                    partners[name] = partner
                    stats["partenaires"] += 1
                _, created = Partnership.objects.get_or_create(
                    project=project, partner=partner, nature="AUTRE", defaults={"status": link_status}
                )
                stats["partenariats"] += int(created)
            # Budget accordé = financement « obtenu » du CIAT (source unique, agrégée) : permet l'indicateur Financements
            Funding.objects.update_or_create(
                project=project,
                partner=funder,
                defaults={"amount_xof": pr["budget_accorde"], "status": "OBTENU", "date": iso(pr["date_selection"])},
            )
            stats["financements"] += 1

        for f in data["financements"]:
            AnnualBudget.objects.update_or_create(
                year=f["annee"],
                defaults={
                    "allocated_xof": f["budget_total_alloue"],
                    "spent_xof": f["budget_total_depense"],
                    "sources": f["sources"],
                    "is_demo": demo,
                },
            )
            stats["budgets annuels"] += 1
        return stats
