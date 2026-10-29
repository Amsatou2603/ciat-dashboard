# Intégration du jeu de données du data analyst

Fichiers du data analyst : `data/donnees_ciat.json`, `data/validate_data.js` (contrôles qualité), et dans `docs/data_analyst/` : dictionnaire des données, rapport d'analyse, journal de prompts.

> ⚠️ **Le jeu de données est simulé** (il se déclare « jeu de données simulé » et le dictionnaire le précise). Il est donc importé avec `is_demo=True` : l'interface affiche « Données fictives de démonstration ». Si le CIAT valide un jour que ce sont des données officielles : `import_ciat_data --officiel`.

## Importer
```powershell
# 1. contrôles qualité de la data analyst (Node installé) — facultatif
node data/validate_data.js

# 2. appliquer les migrations (nouveaux champs, taxonomie TIC/Automobile)
docker compose run --rm migrate

# 3. simulation puis import réel (remplace le jeu générique de seed_demo)
docker compose run --rm tools python manage.py import_ciat_data --file /data/donnees_ciat.json --dry-run
docker compose run --rm tools python manage.py import_ciat_data --file /data/donnees_ciat.json --reset-demo
```
- **Idempotent** : relancer ne crée aucun doublon (clés `external_id`).
- `--reset-demo` ne supprime **que** les lignes marquées fictives ; jamais une donnée saisie à la main.
- Les données invalides sont rejetées **avant** toute écriture.

## Correspondances (à valider avec la data analyst)
| Jeu de données | Application | Remarque |
|---|---|---|
| `cohortes` (4) | Cohortes + `applications_count`, `selected_count` | 290 candidatures, 77 sélections : **agrégats**, non ventilés |
| `domaines` TIC / Automobile, 10 sous-domaines | Domaines `tic`, `automobile` + sous-domaines | Les 7 domaines du sujet restent en base (inutilisés). Projets sans classement → domaine « Non classé » |
| `porteurs_projets` (25) | Porteurs : **nom complet + genre uniquement** | E-mail, téléphone, âge, formation **non importés** (minimisation) |
| `projets` (20) | Projets | Statut : Idée→*Sélectionné*, En cours→*En incubation*, Prototype validé→*En prototypage* (stade prototype), Déployé→*Terminé* (stade MVP), Abandonné→*Abandonné*. Début = date de sélection. **Pas d'échéance inventée** |
| `retard_jours` | `delay_days` | Un projet est « en retard » s'il est en cours, < 100 % et (échéance dépassée **ou** retard cumulé > 0) |
| budgets (demandé/accordé/dépensé) | Champs du projet **+** un financement « Obtenu » = budget accordé, source « CIAT — budget accordé aux projets » | Correspondance choisie pour alimenter l'indicateur Financements ; la source réelle n'est pas connue |
| `partenariats` (18) + noms cités par les projets | Partenaires ; liens projet↔partenaire de nature « non précisée » | 10 noms cités par des projets sont absents du registre : créés « type non précisé ». Statut du lien **dérivé** (actif si le projet est en cours) |
| `financements` annuels | `AnnualBudget` (page Partenariats & financements) | Agrégats par année et source |
| `evenements` (12) | **Non importés** | Aucune exigence du tableau de bord ; le fichier reste dans `data/` |

## Écarts de définition avec le rapport de la data analyst (à trancher en équipe)
- **Retards** : rapport = 13 projets avec `retard_jours > 0` (dont 1 abandonné) ; tableau de bord = **12** (projets *en cours* uniquement : un projet abandonné n'est pas « en retard »).
- **Genre** : comptage de **porteurs distincts** (9 femmes / 8 hommes = 53 % / 47 %), comme dans le rapport.
- **Candidatures / sélections** : agrégats de cohorte (290 / 77 = 26,6 %), affichés **seulement** si aucun filtre de période, domaine, statut ou porteur n'est actif (sinon message explicatif, jamais de valeur fabriquée). Les « projets sélectionnés » détaillés (19 hors abandonné) sont un sous-ensemble.
- Les analyses par domaine/statut portent sur les **20 projets détaillés**, pas sur les 77 sélections.
