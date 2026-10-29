# Versions et commandes principales

## Technologies (épinglées dans `backend/requirements*.txt` et `frontend/package.json`)
| Composant | Version |
|---|---|
| Python | 3.12 |
| Django / Django REST Framework | 5.2.18 / 3.18.3 |
| Simple JWT / django-filter / drf-spectacular | 5.5.1 / 26.2 / 0.30.0 |
| django-cors-headers / WhiteNoise / gunicorn | 4.9.0 / 6.12.0 / 26.2.0 |
| psycopg2-binary / dj-database-url / httpx | 2.9.13 / 3.1.2 / 0.28.1 |
| openpyxl / reportlab / matplotlib | 3.1.5 / 5.1.0 / 3.11.2 |
| pytest / pytest-django / ruff / pip-audit | 9.1.1 / 4.14.0 / 0.17.2 / voir requirements-dev.txt |
| PostgreSQL | 16 |
| Node.js / npm | v22.22.2 (testé) / 10.x |
| React / React DOM | 18.3.1 |
| TypeScript / Vite / Tailwind CSS | 5.6.3 / 6.4.5 / 3.4.15 |
| React Router / TanStack Query | 7.18.4 / 5.59.20 |
| React Hook Form / Zod / @hookform/resolvers | 7.62.0 / 4.6.7 / 5.2.2 |
| Recharts / lucide-react | 2.13.3 / 0.460.0 |
| Vitest / Testing Library / ESLint | 5.0.5 / 16.0.1 / 9.39.5 |
| nginx (image) | nginxinc/nginx-unprivileged 1.27-alpine (non exécutée ici) |

Choix notables : Tailwind 3 (stable, jetons CSS) plutôt que 4 ; **shadcn/ui non utilisé** (composants maison basés sur `<dialog>` natif et jetons CSS, pour maîtriser accessibilité et poids) ; Zod 4 + resolvers 5 (versions corrigées des failles signalées par `npm audit` sur les versions précédentes).

## Commandes principales
| But | Commande |
|---|---|
| Tout lancer (Docker) | `docker compose up -d` (après `docker compose build`) |
| Migrations | `docker compose run --rm migrate` ou `python manage.py migrate` |
| Créer un admin | `python manage.py createsuperuser` |
| Données fictives | `python manage.py seed_demo --with-users [--reset]` |
| Tests backend | `cd backend; pytest` |
| Tests frontend | `cd frontend; npm test` |
| Qualité | `ruff check . ; ruff format --check .` / `npm run lint ; npm run typecheck` |
| Build frontend | `npm run build` |
| Sauvegarde | `sh scripts/backup_db.sh` |
| Archive ZIP | `powershell -File scripts/make_zip.ps1` ou `sh scripts/make_zip.sh` |
