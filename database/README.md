# Base de données

PostgreSQL 16 (production et développement). SQLite n'est utilisé que comme repli des **tests** sans PostgreSQL ; la suite de tests a été exécutée sur les deux (104/104).

- `schema.md` : diagramme et contraintes.
- `data_dictionary.md` : dictionnaire des données (champ par champ).
- Migrations : `backend/apps/*/migrations/` ; le référentiel des 7 domaines est inséré par `projects/migrations/0002_seed_domains.py`.
- Données de démonstration : `python manage.py seed_demo [--reset] [--with-users]` — **fictives**, idempotentes, refusées hors `DEBUG` sauf `ALLOW_DEMO_SEED=true`.
- Sauvegarde / restauration : `scripts/backup_db.sh`, `scripts/restore_db.sh` (voir `docs/deploiement.md`).
