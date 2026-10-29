# Installation locale

## Prérequis
Docker Desktop (Compose v2) **ou** Python 3.12 + Node 22 + PostgreSQL 16. Git.

## Option A — Docker Compose (recommandé)
> ⚠️ Ces commandes n'ont **pas pu être exécutées** par l'auteur du projet dans son environnement de génération (pas de Docker) ; les composants ont été testés séparément (voir `tests.md`). Signalez toute anomalie avec `fiche_anomalie.md`.

PowerShell (Windows) :
```powershell
Copy-Item .env.example .env
# Éditer .env : POSTGRES_PASSWORD et DJANGO_SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(64))")
docker compose build                       # construire les images
docker compose up -d                       # démarrer (db → migrate → backend → frontend)
docker compose run --rm migrate            # (ré)appliquer les migrations si besoin
docker compose run --rm backend python manage.py createsuperuser        # créer un administrateur
docker compose run --rm -e ALLOW_DEMO_SEED=true -e DJANGO_DEBUG=true backend python manage.py seed_demo --with-users   # données FICTIVES + 4 comptes (mot de passe affiché une fois)
docker compose logs -f --tail=100          # journaux
docker compose down                        # arrêter (les données restent dans le volume)
```
Application : http://localhost:8080 — Swagger : http://localhost:8080/api/docs/ (si `ENABLE_API_DOCS=true`).

**Réinitialiser le développement** (⚠️ supprime la base) : `docker compose down -v`. La commande est volontairement séparée : `down` seul ne supprime rien.

Tests dans Docker : `docker compose run --rm -e DJANGO_SETTINGS_MODULE=config.settings.test backend sh -c "pip install -r requirements-dev.txt && pytest"` (les tests sont exclus de l'image par `.dockerignore` : pour les lancer, utilisez plutôt l'option B).

## Option B — Sans Docker (c'est ainsi que le projet a été vérifié)
```powershell
# Base PostgreSQL
psql -U postgres -c "CREATE USER ciat WITH PASSWORD 'ciat' CREATEDB;"
psql -U postgres -c "CREATE DATABASE ciat OWNER ciat;"

# Backend
cd backend
python -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
$env:DATABASE_URL = "postgres://ciat:ciat@localhost:5432/ciat"
$env:DJANGO_SETTINGS_MODULE = "config.settings.dev"
python manage.py migrate
python manage.py seed_demo --with-users        # mot de passe aléatoire affiché une fois (ou --password "...")
python manage.py runserver                     # http://localhost:8000

# Frontend (autre terminal)
cd frontend
npm ci
npm run dev                                    # http://localhost:5173 (proxy /api → :8000)
```
(`runserver` : **développement uniquement**.)

## Comptes de démonstration
`admin_demo`, `coordo_demo`, `analyste_demo`, `lecteur_demo` (un par rôle). **Aucun mot de passe par défaut** : il est généré à la création (ou fourni par `--password`). Ces comptes n'existent qu'après `--with-users`.

## Activer l'assistant IA
Dans `.env` (ou dans les variables d'environnement de l'hébergeur) : `AI_PROVIDER=gemini` (ou `anthropic`), `AI_API_KEY=<votre clé>`, et facultativement `AI_MODEL` (défaut : `gemini-2.5-flash`). Redémarrer le backend. Sans clé, l'assistant fonctionne en mode « calcul serveur » et l'indique. **Il faut que `AI_PROVIDER` corresponde à la clé** : une clé Gemini envoyée avec `AI_PROVIDER=anthropic` est refusée et l'interface affiche « service IA momentanément indisponible ». Diagnostic : le journal du backend indique `Fournisseur IA indisponible : erreur HTTP <code>` (400 requête/modèle, 403 clé refusée ou API non activée, 404 modèle inconnu, 429 quota dépassé).

## Dépannage
- *502 / page blanche* : `docker compose logs backend`.
- *Connexion refusée après 5 essais* : verrou 15 min (par identifiant) ; redémarrer le backend vide le compteur (cache mémoire).
- *Date au format américain* : dépend de la langue du navigateur.
