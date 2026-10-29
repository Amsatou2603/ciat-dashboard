# Guide de déploiement (préparation — **rien n'a été déployé**)

> Aucun déploiement, publication ni modification de dépôt distant n'a été effectué. Ce guide prépare la mise en ligne ; le **lien de déploiement exigé par le jury reste à produire par l'équipe**, avec l'autorisation de la développeuse.

## 1. Principe
Backend Django (gunicorn) + PostgreSQL + frontend statique compilé. Le plus sûr est de servir **frontend et API sous la même origine** (cookie de rafraîchissement `SameSite=Strict`, aucun CORS). Deux façons :
- **Docker Compose / VM** : l'image `frontend` (nginx) relaie `/api` vers `backend` (voir `frontend/infrastructure/nginx.conf`, testé avec un vrai nginx).
- **Plateforme gérée** (ci-dessous : Render + Neon, la pile habituelle de la développeuse).

## 2. Variables d'environnement de production
| Variable | Valeur | Remarque |
|---|---|---|
| `DJANGO_SETTINGS_MODULE` | `config.settings.prod` | Refuse de démarrer si la config est dangereuse |
| `DJANGO_SECRET_KEY` | ≥ 64 car. aléatoires | Jamais dans Git |
| `DJANGO_ALLOWED_HOSTS` | domaines exacts (virgules) | Pas de `*` |
| `DATABASE_URL` | `postgres://…` (avec `?sslmode=require` si base distante) | |
| `CORS_ALLOWED_ORIGINS` | `https://…` (vide si même origine) | |
| `CSRF_TRUSTED_ORIGINS` | `https://…` | seulement si l'admin Django est utilisé |
| `DJANGO_ADMIN_URL` | chemin non devinable | |
| `ENABLE_API_DOCS` | `false` | |
| `REFRESH_COOKIE_SAMESITE` | `Strict` (même origine) | `None` seulement en cross-site (déconseillé) |
| `ALLOW_DEMO_SEED` | absent | Données fictives interdites en production réelle |
| `AI_API_KEY`, `AI_MODEL` | selon décision | Voir risques §« IA » de `securite.md` |

## 3. Procédure générique
1. `pip install -r backend/requirements.txt` ; `python manage.py collectstatic --noinput` (fichiers statiques servis par WhiteNoise).
2. **Migrations contrôlées** : sauvegarder la base, puis `python manage.py migrate --noinput` (une seule fois, hors des workers ; avec Compose : `docker compose run --rm migrate`).
3. `gunicorn config.wsgi:application --workers 3 --timeout 60` (jamais `runserver`).
4. Frontend : `cd frontend && npm ci && npm run build` → publier `dist/` (SPA : toutes les routes renvoient `index.html`).
5. HTTPS obligatoire (certificat géré par la plateforme ou par le reverse proxy) ; transmettre `X-Forwarded-Proto: https`.
6. Créer l'administrateur : `python manage.py createsuperuser` (le superutilisateur reçoit automatiquement le rôle applicatif `admin`).
7. Vérifier : `GET /api/health/` → `{"status":"ok"}` ; `python manage.py check --deploy` ; connexion ; un export.

## 4. Option plateforme : Render (service web + site statique) + Neon (PostgreSQL)
**Ce qui a été vérifié (recherche documentaire)** : un *Static Site* Render accepte une règle **Rewrite** `/api/*` → URL **publique** du service web ; la destination ne peut pas être l'adresse interne du service. Des retours de la communauté Render signalent une **latence supplémentaire** avec ce proxy (non mesurée ici).
**Non vérifié par l'auteur** (à contrôler dans la documentation des plateformes avant usage) : limites des offres gratuites (mise en veille, durée de vie de la base), paramètres exacts de connexion Neon (pooler vs connexion directe : appliquer les **migrations avec la connexion directe**), prise en compte du `Host` par le proxy.

Configuration proposée :
1. **Neon** : créer la base, copier l'URL (`sslmode=require`) → `DATABASE_URL`.
2. **Render — Web Service (Python)** : racine `backend/`, build `pip install -r requirements.txt && python manage.py collectstatic --noinput`, commande de pré-déploiement/démarrage `python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 3`, variables du §2. `DJANGO_ALLOWED_HOSTS` doit contenir le **domaine du site statique ET celui du service web**.
3. **Render — Static Site** : racine `frontend/`, build `npm ci && npm run build`, publication `dist`. Règles : (a) Rewrite `/api/*` → `https://<service-web>.onrender.com/api/*` ; (b) Rewrite `/*` → `/index.html` (SPA), **dans cet ordre**.
4. En-têtes de sécurité du site statique : à configurer dans les *Headers* Render (reprendre `frontend/infrastructure/security-headers.conf`, dont la CSP) — **non vérifié** que la plateforme les applique à l'identique.
5. Plan B si le proxy statique pose problème : déployer l'image `frontend` (nginx) comme service web Docker et adapter `proxy_pass` (non testé).
6. Limitation DRF : derrière un proxy, définir `REST_FRAMEWORK['NUM_PROXIES']` pour que les limites par IP visent la bonne adresse (à régler avec la topologie réelle).

## 5. Sauvegardes et restauration PostgreSQL
- **Sauvegarde** : `sh scripts/backup_db.sh` (Compose) ou `pg_dump -Fc "$DATABASE_URL" > ciat-AAAAMMJJ.dump`. Fréquence conseillée : quotidienne + avant chaque migration. Conserver **hors dépôt**, chiffrer selon la politique de l'ISEP.
- **Restauration** : `sh scripts/restore_db.sh fichier.dump` (demande confirmation « OUI ») ou `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" fichier.dump`, puis `migrate`.
- **Tester la restauration** sur une base vide au moins une fois avant la mise en production (non fait ici).
- Plateformes gérées : vérifier la sauvegarde automatique/rétention proposée.

## 6. Journaux et surveillance
Journaux sur la sortie standard (`LOG_LEVEL`) : pas de corps de requête, pas de jeton. Sonde de santé : `/api/health/` (200 `ok` / 503 `degraded`). Journal d'audit : `/api/audit/` (admin).

## 7. Retour arrière
1. Redéployer la version précédente de l'image/du commit. 2. Si une migration a été appliquée et qu'elle n'est pas rétro-compatible : restaurer la sauvegarde d'avant migration (§5). 3. Vérifier `/api/health/` et un parcours de connexion. 4. Consigner l'incident (`fiche_anomalie.md`).

## 8. Après le déploiement
Changer tous les mots de passe initiaux ; supprimer tout compte `*_demo` ; vérifier HTTPS/HSTS ; relancer la liste « Avant publication » de `securite.md` ; tester un export et l'assistant (avec et sans clé IA).

## 9. Option Vercel (deux projets) + Neon
Vercel héberge le **frontend** (site statique) et, via son runtime Python, le **backend Django comme une seule fonction serverless** (limite de bundle : 500 Mo, vérifiée dans la documentation Vercel). Deux projets Vercel, une base Neon.

**Points de vigilance**
- Fonctions serverless : mémoire non partagée entre instances → activer `USE_DB_CACHE=true` (limites de débit et verrou de compte stockés en base ; exécuter `python manage.py createcachetable` une fois).
- Le frontend relaie `/api` vers le backend (`frontend/vercel.json`) : le navigateur ne voit qu'**une seule origine** (cookie `SameSite=Strict`). Le backend accepte les URL avec ou sans `/` final (`ApiTrailingSlashMiddleware`).
- **Non vérifié** (à contrôler au premier déploiement) : transmission du `Set-Cookie` à travers la réécriture, durée maximale des exports PDF/Excel/image dans une fonction, démarrages à froid, connexion Neon « poolée » vs directe.

**Étapes** : 1) Neon : créer la base, copier l'URL (`sslmode=require`). 2) Depuis votre PC : `migrate`, `createcachetable`, `import_ciat_data`, `createsuperuser` contre cette URL (commandes dans la réponse de livraison). 3) Projet Vercel « backend » : Root Directory `backend`, variables du §2 + `USE_DB_CACHE=true`. 4) Projet Vercel « frontend » : Root Directory `frontend`, après avoir remplacé l'URL du backend dans `frontend/vercel.json`. 5) Tester `/api/health/` puis une connexion.
