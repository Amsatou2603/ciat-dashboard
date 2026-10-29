import pytest

from apps.accounts.models import Role
from apps.ai_assistant import providers, service
from apps.ai_assistant.models import AssistantExchange
from apps.audit.models import AuditLog

pytestmark = pytest.mark.django_db
ASK = "/api/assistant/ask/"


class FakeProvider:
    def __init__(self, reply="OK", boom=None):
        self.reply, self.boom, self.calls = reply, boom, []

    def generate(self, system, user):
        self.calls.append((system, user))
        if self.boom:
            raise self.boom
        return self.reply


def ask(client, question, **filters):
    return client.post(ASK, {"question": question, "filters": filters}, format="json")


def test_without_api_key_service_is_clearly_not_configured(client_for, world):
    response = ask(client_for(Role.ANALYST), "Combien de projets sont en retard ?")
    assert response.status_code == 200
    assert response.data["ai_configured"] is False and response.data["ai_generated"] is False
    assert "non configuré" in response.data["warning"] and "1 projet(s) en retard sur 3" in response.data["answer"]
    assert client_for(Role.ANALYST).get("/api/assistant/status/").data["configured"] is False


@pytest.mark.parametrize(
    "question,intent",
    [
        ("Combien de projets sont en retard ?", "late"),
        ("Quel domaine compte le plus de projets ?", "top_domain"),
        ("Compare les deux dernières cohortes.", "cohorts"),
        ("Quel est le montant total des financements enregistrés ?", "funding"),
        ("Résume la situation des projets de la période sélectionnée.", "summary"),
        ("Combien d'idées reçues ?", "counts"),
        ("Quelle est la météo ?", "unsupported"),
    ],
)
def test_intent_detection(client_for, world, question, intent):
    assert ask(client_for(Role.ANALYST), question).data["intent"] == intent


def test_answers_respect_filters(client_for, world):
    response = ask(client_for(Role.ANALYST), "Combien d'idées reçues ?", cohort=world["c1"].pk)
    assert "2 idée(s)" in response.data["answer"]


def test_unsupported_question_never_invents(client_for, world, monkeypatch):
    fake = FakeProvider("Il y a 9999 projets")
    monkeypatch.setattr(providers, "get_provider", lambda: fake)
    response = ask(client_for(Role.ANALYST), "Quelle est la météo ?")
    assert fake.calls == [] and response.data["ai_generated"] is False and "Je ne peux pas répondre" in response.data["answer"]


def test_ai_answer_used_when_grounded_and_model_gets_only_computed_data(client_for, world, monkeypatch):
    fake = FakeProvider("Un projet est en retard sur trois projets en cours : 1 sur 3.")
    monkeypatch.setattr(providers, "get_provider", lambda: fake)
    response = ask(client_for(Role.ANALYST), "Combien de projets sont en retard ?")
    assert response.data["ai_generated"] is True and "En retard" not in response.data["answer"]
    system, payload = fake.calls[0]
    assert "n'en invente aucun" in system and "late_projects" in payload
    assert "Awa T." not in payload and "password" not in payload.lower()  # pas de données personnelles inutiles


def test_hallucinated_numbers_are_rejected_and_replaced(client_for, world, monkeypatch):
    monkeypatch.setattr(providers, "get_provider", lambda: FakeProvider("Il y a 42 projets en retard."))
    response = ask(client_for(Role.ANALYST), "Combien de projets sont en retard ?")
    assert response.data["ai_generated"] is False and "non vérifiés" in response.data["warning"] and "42" not in response.data["answer"]


def test_provider_failure_falls_back_to_server_result(client_for, world, monkeypatch):
    monkeypatch.setattr(providers, "get_provider", lambda: FakeProvider(boom=providers.ProviderError("délai dépassé")))
    response = ask(client_for(Role.ANALYST), "Combien de projets sont en retard ?")
    assert response.status_code == 200 and response.data["ai_generated"] is False and "indisponible" in response.data["warning"]


def test_gender_question_denied_without_personal_capability(client_for, world, monkeypatch):
    users_role = Role.ANALYST  # l'analyste a le droit ; le lecteur n'a pas accès à l'assistant du tout
    assert "Femmes" in ask(client_for(users_role), "Quelle est la répartition par genre ?").data["answer"]
    assert ask(client_for(Role.READER), "genre ?").status_code == 403


def test_input_validation_and_limits(client_for, world):
    client = client_for(Role.ANALYST)
    assert ask(client, "").status_code == 400
    assert ask(client, "x" * 501).status_code == 400
    assert client.post(ASK, {"question": "ok", "filters": {"secret": 1}}, format="json").status_code == 400
    assert ask(client, "Combien de projets ?", period_start="2026-01-01", period_end="2025-01-01").status_code == 400


def test_history_is_private_limited_and_clearable(client_for, world, settings):
    settings.AI_HISTORY_LIMIT = 3
    analyst, coord = client_for(Role.ANALYST), client_for(Role.COORDINATOR)
    for i in range(5):
        ask(analyst, f"Combien de projets {i} ?")
    ask(coord, "Combien d'idées ?")
    mine = analyst.get("/api/assistant/history/").data["items"]
    assert len(mine) == 3 and AssistantExchange.objects.filter(user__username="analyst").count() == 3
    assert all("idées" not in e["question"] for e in mine)  # l'historique du coordonnateur n'est pas visible
    assert analyst.delete("/api/assistant/history/").status_code == 204
    assert analyst.get("/api/assistant/history/").data["items"] == []
    assert coord.get("/api/assistant/history/").data["items"]


def test_audit_never_stores_question_text(client_for, world):
    ask(client_for(Role.ANALYST), "Question confidentielle sur le projet secret ?")
    logs = AuditLog.objects.filter(action="assistant_ask")
    assert logs.exists() and "confidentielle" not in str(list(logs.values()))


def test_number_guard_unit():
    assert service.numbers_are_grounded("1 250 000 XOF et 12,5 %", '{"a": 1250000, "b": 12.5}')
    assert not service.numbers_are_grounded("Il y a 7 projets", '{"a": 3}')
    assert service.numbers_are_grounded("Aucun chiffre ici", "{}")
