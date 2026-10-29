# Tests et vérifications

## Commandes
```powershell
# Backend (SQLite en mémoire par défaut ; PostgreSQL si DATABASE_URL est défini)
cd backend
$env:DJANGO_SETTINGS_MODULE = "config.settings.test"
pytest                                   # 120 tests
$env:DATABASE_URL = "postgres://ciat:ciat@localhost:5432/ciat" ; pytest   # mêmes tests sur PostgreSQL
ruff check . ; ruff format --check .     # qualité / formatage
python manage.py makemigrations --check --dry-run   # migrations à jour
pip-audit -r requirements.txt            # vulnérabilités connues

# Frontend
cd frontend
npm run lint ; npm run typecheck ; npm test ; npm run build ; npm audit
```

## Résultats **réellement observés** lors de la génération du projet
| Contrôle | Résultat |
|---|---|
| `pytest` (backend) sur SQLite | **120 réussis** |
| `pytest` (backend) sur **PostgreSQL 16** | **120 réussis** |
| `ruff check` / `ruff format --check` | aucun problème / 79 fichiers conformes |
| `makemigrations --check` | à jour |
| `manage.py check --deploy` (config prod fictive) | 1 avertissement : HSTS *preload* (volontairement non activé) |
| `pip-audit` | aucune vulnérabilité connue |
| `vitest` (frontend) | **49 réussis** (7 fichiers) |
| `eslint --max-warnings 0`, `tsc --noEmit` | aucun problème |
| `npm audit` (prod + dev) | 0 vulnérabilité |
| `npm run build` | réussi |
| Migrations + `seed_demo` sur PostgreSQL | réussis ; ré-exécution idempotente (0 doublon) |
| **Navigateur réel (Chromium/Playwright)** : parcours complet | connexion refusée/acceptée, route protégée, filtre cohorte (31 → 10 projets), période invalide, thème sombre persistant, création d'un projet (validation puis enregistrement lu en base), détail, suppression avec confirmation, assistant (réponse serveur « sans IA »), **téléchargement réel PDF/XLSX/PNG**, navigation clavier (lien d'évitement), déconnexion + session révoquée, rôle Lecteur (menu restreint, `/utilisateurs` refusé) |
| Responsive (390 / 820 / 1440 px, clair et sombre) | captures examinées ; **0 débordement horizontal** après correction |
| App derrière **nginx réel** avec la CSP stricte | 0 violation CSP, graphiques et indicateurs rendus |

## Couverture par thème (backend)
Connexion, verrouillage, rotation/révocation des jetons, permissions par rôle, accès non autorisés, validation, création/modification, filtres (combinés, vides, invalides, périodes inversées), calculs d'indicateurs (valeurs calculées à la main, absence de double comptage, divisions par zéro), cas sans données, exports (contenu, filtres, formules Excel, volume), assistant avec **fournisseur simulé** (anti-chiffres inventés, pannes, droits, historique privé), configuration de production, seed (idempotence, refus hors debug).
## Couverture frontend
Client API (jeton en mémoire, rejeu après 401, refresh unique, erreurs), schémas Zod, navigation protégée, connexion (validation, erreurs, verrou), filtres (URL, combinaison, période invalide, valeurs corrompues), tableau de bord (indicateurs, états vide / erreur / chargement, masquage selon rôle), formulaire projet (validation, erreurs serveur), assistant (non configuré, étiquettes IA / serveur, 429).

## **Non exécuté** (et pourquoi)
| Élément | Raison / prérequis |
|---|---|
| `docker compose build/up`, images Docker | Docker indisponible dans l'environnement de génération. Prérequis : Docker Desktop |
| Appel réel au fournisseur d'IA | Aucune clé API fournie ; seul un fournisseur **simulé** est testé. Prérequis : `AI_API_KEY` |
| Workflow GitHub Actions | Non exécuté (aucun dépôt distant). Les mêmes commandes ont été exécutées localement |
| Test de restauration d'une sauvegarde (`pg_dump`/`pg_restore`) | Scripts écrits, **non exécutés** |
| Déploiement (Render/Neon) et HTTPS réel | Aucun déploiement sans autorisation |
| Audit d'accessibilité automatisé (axe/Lighthouse), lecteur d'écran | Outils non installés |
| Tests sur Safari / Firefox / vrais téléphones | Seul Chromium a été utilisé |
| Test de charge, test d'intrusion | Hors périmètre |
| Tests E2E automatisés versionnés | Les parcours ont été joués par script ponctuel, **non conservé** dans le dépôt |
