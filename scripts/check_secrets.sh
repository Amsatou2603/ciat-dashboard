#!/bin/sh
# Contrôle rapide avant commit : aucun .env suivi par Git, aucun motif de secret évident dans les fichiers suivis.
set -eu
if git ls-files --error-unmatch .env >/dev/null 2>&1; then echo "ERREUR : .env est suivi par Git"; exit 1; fi
if git grep -nEI "(AKIA[0-9A-Z]{16}|sk-ant-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----)" -- . ':!scripts/check_secrets.sh' ':!docs'; then echo "ERREUR : motif de secret détecté"; exit 1; fi
echo "OK : aucun secret évident détecté."
