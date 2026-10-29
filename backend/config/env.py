"""Lecture typée des variables d'environnement (aucune dépendance externe)."""

import os


def env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value if value not in (None, "") else default


def env_bool(name: str, default: bool = False) -> bool:
    value = env(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = env(name)
    try:
        return int(value) if value is not None else default
    except ValueError:
        return default


def env_list(name: str, default: list[str] | None = None) -> list[str]:
    value = env(name)
    if value is None:
        return list(default or [])
    return [item.strip() for item in value.split(",") if item.strip()]
