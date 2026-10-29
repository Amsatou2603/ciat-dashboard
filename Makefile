# Raccourcis facultatifs (nécessite `make`). Sous Windows PowerShell, utilisez directement les commandes `docker compose` de docs/installation.md.
.PHONY: build up down logs migrate superuser demo test-backend test-frontend lint backup reset-dev
build: ; docker compose build
up: ; docker compose up -d
down: ; docker compose down
logs: ; docker compose logs -f --tail=100
migrate: ; docker compose run --rm migrate
superuser: ; docker compose run --rm backend python manage.py createsuperuser
demo: ; docker compose run --rm -e ALLOW_DEMO_SEED=true -e DJANGO_DEBUG=true backend python manage.py seed_demo --with-users
test-backend: ; cd backend && DJANGO_SETTINGS_MODULE=config.settings.test pytest
test-frontend: ; cd frontend && npm test
lint: ; cd backend && ruff check . && ruff format --check . ; cd frontend && npm run lint && npm run typecheck
backup: ; sh scripts/backup_db.sh
reset-dev: ; @echo "Supprime les conteneurs ET le volume de données (développement uniquement)." && docker compose down -v
