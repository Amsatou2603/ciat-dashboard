from config.env import env, env_bool, env_list

from .base import *  # noqa: F401,F403

DEBUG = env_bool("DJANGO_DEBUG", True)
SECRET_KEY = env("DJANGO_SECRET_KEY") or "dev-only-insecure-key-do-not-use-in-production-0123456789"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", ["localhost", "127.0.0.1", "backend"])
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"])
REFRESH_COOKIE_SECURE = False  # HTTP local uniquement
ENABLE_API_DOCS = True
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
