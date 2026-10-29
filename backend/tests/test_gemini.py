import httpx
import pytest

from apps.accounts.models import Role
from apps.ai_assistant import providers

pytestmark = pytest.mark.django_db
KEY = "AIza-cle-secrete-de-test"


def fake_post(response=None, boom=None, calls=None):
    def _post(url, headers=None, json=None, timeout=None):
        if calls is not None:
            calls.append({"url": url, "headers": headers, "json": json, "timeout": timeout})
        if boom:
            raise boom
        return response

    return _post


def ok(text="Réponse"):
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": text}]}}]}, request=httpx.Request("POST", "http://x"))


def make(model="gemini-2.5-flash"):
    return providers.GeminiProvider(KEY, model, 20, 500)


def test_request_format_key_in_header_not_in_url(monkeypatch):
    calls = []
    monkeypatch.setattr(httpx, "post", fake_post(ok("Bonjour"), calls=calls))
    assert make().generate("SYSTEME", "QUESTION") == "Bonjour"
    call = calls[0]
    assert call["url"] == "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    assert call["headers"]["x-goog-api-key"] == KEY and KEY not in call["url"]
    body = call["json"]
    assert body["system_instruction"]["parts"][0]["text"] == "SYSTEME"
    assert body["contents"][0]["parts"][0]["text"] == "QUESTION"
    assert body["generationConfig"]["thinkingConfig"] == {"thinkingBudget": 0}  # pas de jetons de réflexion sur Flash


def test_non_flash_models_keep_a_larger_output_budget(monkeypatch):
    calls = []
    monkeypatch.setattr(httpx, "post", fake_post(ok(), calls=calls))
    make("gemini-2.5-pro").generate("s", "u")
    config = calls[0]["json"]["generationConfig"]
    assert "thinkingConfig" not in config and config["maxOutputTokens"] >= 2048


def test_multiple_parts_are_joined(monkeypatch):
    resp = httpx.Response(
        200, json={"candidates": [{"content": {"parts": [{"text": "Un "}, {"text": "deux"}]}}]}, request=httpx.Request("POST", "http://x")
    )
    monkeypatch.setattr(httpx, "post", fake_post(resp))
    assert make().generate("s", "u") == "Un deux"


@pytest.mark.parametrize("status", [400, 403, 404, 429, 500])
def test_http_errors_become_provider_errors_without_leaking_the_key(monkeypatch, status):
    resp = httpx.Response(status, json={"error": {"message": f"clé {KEY} refusée"}}, request=httpx.Request("POST", "http://x"))
    monkeypatch.setattr(httpx, "post", fake_post(resp))
    with pytest.raises(providers.ProviderError) as exc:
        make().generate("s", "u")
    assert str(status) in str(exc.value) and KEY not in str(exc.value)


@pytest.mark.parametrize(
    "payload", [{}, {"candidates": []}, {"promptFeedback": {"blockReason": "SAFETY"}}, {"candidates": [{"finishReason": "SAFETY"}]}]
)
def test_empty_or_blocked_answers_are_errors(monkeypatch, payload):
    monkeypatch.setattr(httpx, "post", fake_post(httpx.Response(200, json=payload, request=httpx.Request("POST", "http://x"))))
    with pytest.raises(providers.ProviderError):
        make().generate("s", "u")


def test_timeout_and_network_errors(monkeypatch):
    monkeypatch.setattr(httpx, "post", fake_post(boom=httpx.ReadTimeout("lent")))
    with pytest.raises(providers.ProviderError, match="délai"):
        make().generate("s", "u")
    monkeypatch.setattr(httpx, "post", fake_post(boom=httpx.ConnectError("réseau")))
    with pytest.raises(providers.ProviderError):
        make().generate("s", "u")


def test_get_provider_selects_gemini_and_default_model(settings):
    settings.AI_API_KEY, settings.AI_PROVIDER, settings.AI_MODEL = KEY, "gemini", "gemini-2.5-flash"
    assert isinstance(providers.get_provider(), providers.GeminiProvider)
    settings.AI_PROVIDER = "inconnu"
    assert providers.get_provider() is None
    settings.AI_PROVIDER, settings.AI_API_KEY = "gemini", ""
    assert providers.get_provider() is None


def test_end_to_end_answer_with_gemini_grounded_in_server_data(monkeypatch, settings, client_for, world):
    settings.AI_API_KEY, settings.AI_PROVIDER, settings.AI_MODEL = KEY, "gemini", "gemini-2.5-flash"
    monkeypatch.setattr(httpx, "post", fake_post(ok("Un projet est en retard sur 3 en cours : 1 sur 3.")))
    r = client_for(Role.ANALYST).post("/api/assistant/ask/", {"question": "Combien de projets sont en retard ?"}, format="json")
    assert r.status_code == 200 and r.data["ai_generated"] is True and r.data["ai_configured"] is True


def test_gemini_failure_falls_back_to_server_result(monkeypatch, settings, client_for, world):
    settings.AI_API_KEY, settings.AI_PROVIDER, settings.AI_MODEL = KEY, "gemini", "gemini-2.5-flash"
    resp = httpx.Response(403, json={}, request=httpx.Request("POST", "http://x"))
    monkeypatch.setattr(httpx, "post", fake_post(resp))
    r = client_for(Role.ANALYST).post("/api/assistant/ask/", {"question": "Combien de projets sont en retard ?"}, format="json")
    assert r.data["ai_generated"] is False and "indisponible" in r.data["warning"] and "1 projet(s) en retard" in r.data["answer"]


def test_model_default_follows_provider(monkeypatch):
    import importlib

    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.delenv("AI_MODEL", raising=False)
    from config.settings import base

    assert importlib.reload(base).AI_MODEL == "gemini-2.5-flash"
    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    assert importlib.reload(base).AI_MODEL == "claude-sonnet-4-6"
    monkeypatch.delenv("AI_PROVIDER")
    importlib.reload(base)
