"""Fournisseurs de modèles de langage. La clé API reste côté serveur (variable d'environnement)."""

from __future__ import annotations

from typing import Protocol

import httpx
from django.conf import settings


class ProviderError(Exception):
    """Erreur du fournisseur (réseau, quota, réponse invalide). Le message ne contient jamais de secret."""


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
            raise ProviderError("délai dépassé") from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderError(f"erreur HTTP {exc.response.status_code}") from exc  # pas de corps ni d'en-têtes
        except (httpx.HTTPError, ValueError) as exc:
            raise ProviderError("fournisseur injoignable ou réponse invalide") from exc
        if not text:
            raise ProviderError("réponse vide")
        return text


class GeminiProvider:
    """API Google Gemini (generateContent). La clé voyage dans l'en-tête `x-goog-api-key`, jamais dans l'URL (donc jamais journalisée)."""

    base_url = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(self, api_key: str, model: str, timeout: int, max_tokens: int):
        self.api_key, self.model, self.timeout, self.max_tokens = api_key, model, timeout, max_tokens

    def _payload(self, system: str, user: str) -> dict:
        config: dict = {"temperature": 0.2, "maxOutputTokens": self.max_tokens}
        if self.model.startswith("gemini-2.5-flash"):
            # Les modèles 2.5 « réfléchissent » avant de répondre et ces jetons comptent dans la limite de sortie : on les désactive
            # (thinkingBudget = 0) pour que la réponse courte ne soit pas tronquée ou vide.
            config["thinkingConfig"] = {"thinkingBudget": 0}
        else:
            config["maxOutputTokens"] = max(self.max_tokens, 2048)  # marge si le modèle ne permet pas de couper la réflexion
        return {
            "system_instruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": config,
        }

    def generate(self, system: str, user: str) -> str:
        try:
            response = httpx.post(
                f"{self.base_url}/{self.model}:generateContent",
                headers={"x-goog-api-key": self.api_key, "content-type": "application/json"},
                json=self._payload(system, user),
                timeout=self.timeout,
            )
            response.raise_for_status()
            candidates = response.json().get("candidates") or []
            parts = (candidates[0].get("content") or {}).get("parts", []) if candidates else []
            text = "".join(p.get("text", "") for p in parts).strip()
        except httpx.TimeoutException as exc:
            raise ProviderError("délai dépassé") from exc
        except httpx.HTTPStatusError as exc:
            raise ProviderError(f"erreur HTTP {exc.response.status_code}") from exc  # ni corps, ni en-têtes, ni clé
        except (httpx.HTTPError, ValueError, AttributeError) as exc:
            raise ProviderError("fournisseur injoignable ou réponse invalide") from exc
        if not text:
            raise ProviderError("réponse vide ou bloquée")
        return text


def get_provider() -> Provider | None:
    """None si aucune clé n'est configurée : l'assistant l'annonce explicitement au lieu de simuler une IA."""
    if not settings.AI_API_KEY:
        return None
    args = (settings.AI_API_KEY, settings.AI_MODEL, settings.AI_TIMEOUT_SECONDS, settings.AI_MAX_OUTPUT_TOKENS)
    if settings.AI_PROVIDER == "anthropic":
        return AnthropicProvider(*args)
    if settings.AI_PROVIDER == "gemini":
        return GeminiProvider(*args)
    return None  # fournisseur inconnu : traité comme « non configuré »
