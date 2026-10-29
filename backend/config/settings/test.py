import os

from .base import *  # noqa: F401,F403

DEBUG = False
SECRET_KEY = "test-secret-key-only-for-automated-tests-0123456789abcdef"
ALLOWED_HOSTS = ["testserver", "localhost"]
REFRESH_COOKIE_SECURE = False
ENABLE_API_DOCS = True
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]  # tests rapides uniquement
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1000/min",
        "user": "1000/min",
        "login": "1000/min",
        "refresh": "1000/min",
        "ai": "1000/min",
        "export": "1000/min",
    },
}
if not os.environ.get("DATABASE_URL"):  # repli SQLite pour exécuter les tests sans PostgreSQL
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
AI_API_KEY = ""
