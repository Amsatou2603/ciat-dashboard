#!/bin/sh
# Restauration PostgreSQL. ATTENTION : remplace le contenu de la base. Usage : sh scripts/restore_db.sh backups/fichier.dump
set -eu
[ $# -eq 1 ] || { echo "Usage : $0 fichier.dump" >&2; exit 1; }
printf "Cette opération ÉCRASE la base actuelle. Taper OUI pour continuer : "; read -r answer
[ "$answer" = "OUI" ] || { echo "Annulé."; exit 1; }
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$1"
echo "Restauration terminée. Relancer ensuite : docker compose run --rm migrate"
