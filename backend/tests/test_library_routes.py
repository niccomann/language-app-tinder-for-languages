from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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
    assert data["words_with_examples"] >= 5


def test_word_db_row_exposes_full_producer_row_without_media_payloads():
    response = client.get("/api/library/words/2/db-row")

    assert response.status_code == 200
    data = response.json()
    assert data["word"]["word"] == "Hund"
    assert data["word"]["hypernym"] == "Tier"
    assert data["media"]["has_image_base64"] is True
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
    assert languages >= {"en", "de", "it", "fr", "es"}


def test_word_db_row_exposes_verb_conjugations_for_verbs():
    response = client.get("/api/library/words/103/db-row")

    assert response.status_code == 200
    data = response.json()
    assert data["word"]["word"] == "gehen"
    assert data["word"]["part_of_speech"] == "verb"
    forms = {
        (row["mood"], row["tense"], row["pronoun"]): row["form"]
        for row in data["related"]["verb_conjugations"]
    }
    assert forms[("indicative", "present", "ich")] == "gehe"
    assert forms[("indicative", "perfect", "ich")] == "bin gegangen"


def test_dialect_words_endpoint_uses_producer_schema_and_returns_list():
    response = client.get("/api/library/dialects?language=de")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
