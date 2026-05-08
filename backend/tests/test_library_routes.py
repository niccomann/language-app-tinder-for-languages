from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app


client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_APP = REPO_ROOT / "backend" / "app"


def test_library_routes_centralize_flashcard_enriched_mapping():
    source = (BACKEND_APP / "routes" / "library.py").read_text()
    serializers = BACKEND_APP / "services" / "library_serializers.py"

    assert serializers.exists()
    serializer_source = serializers.read_text()
    assert "def entity_to_enriched_data(" in serializer_source
    assert "def build_flashcard_detail(" in serializer_source
    assert "def build_word_db_row(" in serializer_source
    assert "def entity_to_enriched(" not in source
    assert "FlashcardEnriched," not in source
    assert "def entity_to_enriched_data(" not in source
    assert "**entity_to_enriched_data(card)" not in source


def test_library_route_is_thin_and_delegates_to_services():
    route_source = (BACKEND_APP / "routes" / "library.py").read_text()
    service = BACKEND_APP / "services" / "library_service.py"
    queries = BACKEND_APP / "services" / "library_queries.py"

    assert service.exists()
    assert queries.exists()

    assert "from app.services.library_service import" in route_source
    assert "from sqlalchemy" not in route_source
    assert "from sqlmodel" not in route_source
    assert "from app.database.models import" not in route_source

    for helper_name in (
        "fetch_all_mappings",
        "fetch_one_mapping",
        "fetch_producer_word_for_card",
        "count_words_with_related_rows",
        "fetch_detail_related_rows",
        "fetch_full_related_rows",
        "media_summary",
        "remove_media_columns",
    ):
        assert f"def {helper_name}(" not in route_source

    query_source = queries.read_text()
    assert "def fetch_producer_word_for_card(" in query_source
    assert "def count_words_with_related_rows(" in query_source
    assert "def fetch_detail_related_rows(" in query_source
    assert "def fetch_full_related_rows(" in query_source


def test_word_detail_reads_rich_rows_from_producer_schema():
    response = client.get("/api/library/words/2")

    assert response.status_code == 200
    data = response.json()
    assert data["word"] == "Hund"
    assert data["part_of_speech"] == "noun"
    assert data["gender"] == "masculine"
    assert data["etymologies"]
    assert data["examples"]
    assert data["collocations"]


def test_library_stats_counts_producer_schema_relations():
    response = client.get("/api/library/stats?language=de")

    assert response.status_code == 200
    data = response.json()
    assert data["total_words"] >= 5
    assert data["words_with_etymology"] >= 1
    assert data["words_with_examples"] >= 2


def test_word_db_row_exposes_full_producer_row_without_media_payloads():
    response = client.get("/api/library/words/2/db-row")

    assert response.status_code == 200
    data = response.json()
    assert data["word"]["word"] == "Hund"
    assert data["word"]["hypernym"] == "Tier"
    assert "has_image_base64" in data["media"]
    if data["media"]["has_image_base64"]:
        assert data["media"]["image_base64_length"] > 1000
    assert "image_base64" not in data["word"]
    assert "audio_base64" not in data["word"]
    assert data["related"]["example_sentences"]
    assert data["related"]["etymologies"]


def test_word_db_row_exposes_translation_family():
    response = client.get("/api/library/words/2/db-row")

    assert response.status_code == 200
    data = response.json()
    languages = {row["language"] for row in data["related"]["translation_family"]}
    assert "de" in languages
    if len(languages) > 1:
        assert languages >= {"en", "de", "it", "fr", "es"}


def test_word_db_row_exposes_verb_conjugations_for_verbs():
    words_response = client.get("/api/library/words?language=de&search=Schreiben&limit=1")
    assert words_response.status_code == 200
    verb = words_response.json()[0]

    response = client.get(f"/api/library/words/{verb['id']}/db-row")

    assert response.status_code == 200
    data = response.json()
    assert data["word"]["word"].casefold() == "schreiben"
    assert data["word"]["part_of_speech"] == "verb"
    forms = {
        (row["mood"], row["tense"], row["pronoun"]): row["form"]
        for row in data["related"]["verb_conjugations"]
    }
    assert forms[("indicative", "present", "ich")] == "schreibe"
    if ("indicative", "perfect", "ich") in forms:
        assert forms[("indicative", "perfect", "ich")] == "habe geschrieben"


def test_dialect_words_endpoint_uses_producer_schema_and_returns_list():
    response = client.get("/api/library/dialects?language=de")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
