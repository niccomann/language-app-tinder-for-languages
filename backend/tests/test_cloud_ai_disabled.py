from app.services.sentence_validator import ConnectionInfo, NodeInfo, SentenceValidatorService, ValidationStatus
from app.services.openai_tts import TextToSpeechService


def test_sentence_validator_starts_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    service = SentenceValidatorService()

    result = service.validate_sentence(
        nodes=[
            NodeInfo(id="subject", label="Der Hund", type="subject"),
            NodeInfo(id="verb", label="frisst", type="predicate"),
        ],
        connections=[ConnectionInfo(from_id="subject", to_id="verb")],
    )

    assert service.client is None
    assert result.status == ValidationStatus.YELLOW
    assert "Validazione AI disabilitata" in result.explanation


def test_tts_service_starts_without_openai_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    service = TextToSpeechService()

    assert service.client is None
