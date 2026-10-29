"""Fournisseurs de modeles de langage. La cle API reste cote serveur (variable d'environnement)."""

from __future__ import annotations

from typing import Protocol

import httpx
from django.conf import settings


class ProviderError(Exception):
    """Erreur du fournisseur (reseau, quota, reponse invalide). Le message ne contient jamais de secret."""


class Provider(Protocol):
    def generate(self, system: str, user: str) -> str: ...


class AnthropicProvider:
    url = "https://api.anthropic.com/v1/messages"

    def __init__(self, api_key: str, model: str, timeout: int, max_tokens: int):
        self.api_key, self.model, self.timeout, self.max_tokens = api_key, model, timeout, max_tokens

    def generate(self, system: str, user: str) -> str:
        try:
            response = httpx.post(
                self.url,
                headers={"x-api-key": self.api_key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={
                    "model": self.model,
                    "max_tokens": self.max_tokens,
                    "system": system,
                    "messages": [{"role": "user", "content": user}],
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            blocks = response.json().get("content", [])
            text = "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip()
        except httpx.TimeoutException as exc:
            raise ProviderError("delai depasse") from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderError(f"erreur HTTP {exc.response.status_code}") from exc
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderError("fournisseur injoignable ou reponse invalide") from exc
        if not text:
            raise ProviderError("reponse vide")
        return text


class GeminiProvider:
    """Fournisseur Google Gemini via l'API REST generateContent."""

    def __init__(self, api_key: str, model: str, timeout: int, max_tokens: int):
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.max_tokens = max_tokens

    @property
    def url(self) -> str:
        return f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

    def generate(self, system: str, user: str) -> str:
        import time

        last_error = None
        for attempt in range(2):
            try:
                response = httpx.post(
                    self.url,
                    headers={"content-type": "application/json"},
                    json={
                        "system_instruction": {"parts": [{"text": system}]},
                        "contents": [{"role": "user", "parts": [{"text": user}]}],
                        "generationConfig": {"maxOutputTokens": self.max_tokens},
                    },
                    timeout=self.timeout,
                )
                if response.status_code in (503, 429) and attempt == 0:
                    time.sleep(1.5)
                    continue
                response.raise_for_status()
                candidates = response.json().get("candidates", [])
                text = ""
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    # Filtre les pensées internes si le modèle en renvoie
                    text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
                    if not text:
                        text = "".join(p.get("text", "") for p in parts).strip()
                if not text:
                    raise ProviderError("reponse vide")
                return text
            except httpx.TimeoutException as exc:
                last_error = ProviderError("delai depasse")
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code in (503, 429) and attempt == 0:
                    time.sleep(1.5)
                    continue
                last_error = ProviderError(f"erreur HTTP {exc.response.status_code}")
            except (httpx.HTTPError, ValueError) as exc:
                last_error = ProviderError("fournisseur injoignable ou reponse invalide")

        if last_error:
            raise last_error
        raise ProviderError("fournisseur injoignable")


def get_provider() -> Provider | None:
    """None si aucune cle n est configuree : l assistant l annonce explicitement."""
    if not settings.AI_API_KEY:
        return None
    provider = settings.AI_PROVIDER.lower()
    if provider == "gemini":
        return GeminiProvider(settings.AI_API_KEY, settings.AI_MODEL, settings.AI_TIMEOUT_SECONDS, settings.AI_MAX_OUTPUT_TOKENS)
    if provider == "anthropic":
        return AnthropicProvider(settings.AI_API_KEY, settings.AI_MODEL, settings.AI_TIMEOUT_SECONDS, settings.AI_MAX_OUTPUT_TOKENS)
    return None