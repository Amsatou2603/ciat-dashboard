# Infrastructure

| Élément | Emplacement |
|---|---|
| Orchestration locale / démonstration | `docker-compose.yml` (racine) |
| Image backend (gunicorn, non-root) | `backend/Dockerfile` |
| Image frontend (nginx non-root + proxy `/api`) | `frontend/Dockerfile`, `frontend/infrastructure/nginx.conf`, `frontend/infrastructure/security-headers.conf` |
| Intégration continue | `.github/workflows/ci.yml` |
| Sauvegarde / restauration PostgreSQL | `scripts/backup_db.sh`, `scripts/restore_db.sh` |

> Les fichiers Docker n'ont **pas pu être exécutés** dans l'environnement de génération (pas de Docker). La configuration nginx a été testée avec un vrai nginx, la CSP avec un vrai navigateur (voir `docs/tests.md`).
