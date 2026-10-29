"""Production : refuse de démarrer si la configuration est dangereuse."""

from django.core.exceptions import ImproperlyConfigured

from config.env import env, env_bool, env_int, env_list

from .base import *  # noqa: F401,F403

DEBUG = False
SECRET_KEY = env("DJANGO_SECRET_KEY", "")
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", [])
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", [])
REFRESH_COOKIE_SECURE = True

_problems = []
if len(SECRET_KEY) < 50 or SECRET_KEY.startswith("dev-") or "insecure" in SECRET_KEY or "change-me" in SECRET_KEY:
    _problems.append("DJANGO_SECRET_KEY absente, trop courte (<50) ou factice")
if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    _problems.append("DJANGO_ALLOWED_HOSTS doit lister explicitement les domaines (pas de '*')")
if not env("DATABASE_URL"):
    _problems.append("DATABASE_URL (PostgreSQL) est obligatoire")
if any(origin.startswith("http://") or origin == "*" for origin in CORS_ALLOWED_ORIGINS):
    _problems.append("CORS_ALLOWED_ORIGINS doit contenir uniquement des origines https explicites")
if _problems:
    raise ImproperlyConfigured("Configuration de production invalide : " + " ; ".join(_problems))

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False  # à activer seulement après vérification du domaine
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
ENABLE_API_DOCS = env_bool("ENABLE_API_DOCS", False)

# Plateformes serverless (Vercel…) : chaque instance a sa propre mémoire, donc les compteurs de limitation de débit et de
# verrouillage de compte doivent être partagés. USE_DB_CACHE=true les stocke en base (après : python manage.py createcachetable).
if env_bool("USE_DB_CACHE", False):
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "django_cache"}}
