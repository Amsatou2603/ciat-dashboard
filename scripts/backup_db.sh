#!/bin/sh
# Sauvegarde PostgreSQL (format custom compressé) depuis le conteneur Compose. Usage : sh scripts/backup_db.sh [dossier]
set -eu
DIR="${1:-backups}"; mkdir -p "$DIR"
FILE="$DIR/ciat-$(date +%Y%m%d-%H%M%S).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$FILE"
echo "Sauvegarde créée : $FILE ($(wc -c < "$FILE") octets). Conservez-la HORS du dépôt (elle contient des données)."
