#!/bin/sh
# Crée l'archive du projet sans secrets, caches, dépendances ni builds. Usage : sh scripts/make_zip.sh [sortie.zip]
set -eu
OUT="${1:-../ciat-dashboard.zip}"
cd "$(dirname "$0")/.."
rm -f "$OUT"
zip -r "$OUT" . -x ".env" ".env.*" "!.env.example" "*/node_modules/*" "node_modules/*" "*/dist/*" "*/__pycache__/*" "*.pyc" "*/.pytest_cache/*" "*/.ruff_cache/*" "*/staticfiles/*" ".git/*" "backups/*" "*.zip" ".venv/*" -q
echo "Archive créée : $OUT"
