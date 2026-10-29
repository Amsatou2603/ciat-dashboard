"""Paramètres communs. Les variantes dev/test/prod importent ce module."""

from datetime import timedelta
from pathlib import Path

import dj_database_url

from config.env import env, env_bool, env_int, env_list

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = env("DJANGO_SECRET_KEY", "")
DEBUG = False
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1"])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "apps.core",
    "apps.accounts",
    "apps.projects",
    "apps.partnerships",
    "apps.analytics",
    "apps.ai_assistant",
    "apps.audit",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.ApiTrailingSlashMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

# Base de données : PostgreSQL via DATABASE_URL (sqlite uniquement en test local sans PG).
DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        default="postgres://ciat:ciat@localhost:5432/ciat",
        conn_max_age=60,
    )
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 10}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Africa/Dakar"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "600/min",
        "login": "10/min",
        "refresh": "60/min",
        "ai": "20/min",
        "export": "20/hour",
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_MINUTES", 10)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_DAYS", 7)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Le jeton de rafraîchissement vit dans un cookie HttpOnly limité à /api/auth/.
REFRESH_COOKIE_NAME = "ciat_refresh"
REFRESH_COOKIE_PATH = "/api/auth/"
REFRESH_COOKIE_SAMESITE = env("REFRESH_COOKIE_SAMESITE", "Strict")
REFRESH_COOKIE_SECURE = True  # surchargé en dev (HTTP local)
# En-tête personnalisé obligatoire sur refresh/logout : impossible à forger cross-site sans CORS.
CSRF_GUARD_HEADER = "X-CIAT-Client"

# Verrouillage des comptes après échecs répétés.
LOGIN_MAX_FAILURES = env_int("LOGIN_MAX_FAILURES", 5)
LOGIN_LOCK_SECONDS = env_int("LOGIN_LOCK_SECONDS", 900)

CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", [])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", [])

SPECTACULAR_SETTINGS = {
    "TITLE": "API Tableau de bord décisionnel du CIAT",
    "DESCRIPTION": "API interne : projets, partenariats, financements, indicateurs, exports et assistant IA.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
ENABLE_API_DOCS = env_bool("ENABLE_API_DOCS", False)
ADMIN_URL = env("DJANGO_ADMIN_URL", "gestion-admin/")

# Limites applicatives
EXPORT_MAX_ROWS = env_int("EXPORT_MAX_ROWS", 5000)
AI_MAX_QUESTION_CHARS = 500
AI_HISTORY_LIMIT = 20

# Fournisseur IA (clé uniquement côté serveur ; vide = assistant en mode « non configuré »).
AI_PROVIDER = env("AI_PROVIDER", "anthropic")
AI_API_KEY = env("AI_API_KEY", "")
AI_MODEL = env("AI_MODEL", "claude-sonnet-4-6")
AI_TIMEOUT_SECONDS = env_int("AI_TIMEOUT_SECONDS", 20)
AI_MAX_OUTPUT_TOKENS = env_int("AI_MAX_OUTPUT_TOKENS", 500)

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"std": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "std"}},
    "root": {"handlers": ["console"], "level": env("LOG_LEVEL", "INFO")},
    # Pas de journalisation des corps de requêtes : ni mots de passe ni jetons.
    "loggers": {"django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False}},
}
