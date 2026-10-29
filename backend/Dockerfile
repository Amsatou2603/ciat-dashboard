# Image backend : Python 3.12, utilisateur non-root, serveur WSGI gunicorn (jamais runserver).
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 curl && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
# Fichiers statiques (admin, Swagger) collectés avec des valeurs de build jetables : rien de secret n'est conservé dans l'image.
RUN DJANGO_SETTINGS_MODULE=config.settings.prod DJANGO_SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(64))')" \
    DJANGO_ALLOWED_HOSTS=build DATABASE_URL=postgres://build:build@build/build CORS_ALLOWED_ORIGINS=https://build.invalid \
    python manage.py collectstatic --noinput
RUN useradd --create-home --uid 10001 app && chown -R app /app
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD curl -fsS http://localhost:8000/api/health/ || exit 1
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--timeout", "60", "--access-logfile", "-"]
