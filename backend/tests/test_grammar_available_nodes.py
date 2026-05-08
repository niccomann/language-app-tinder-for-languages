from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_available_nodes_exposes_student_ready_parts_of_speech():
    response = client.get("/api/grammar/available-nodes?limit=300")

    assert response.status_code == 200
    nodes = response.json()
    node_types = {node["type"] for node in nodes}
    parts_of_speech = {node["part_of_speech"] for node in nodes}

    assert {"adjective", "adverb", "preposition", "pronoun", "article", "conjunction"} <= node_types
    assert {
        "noun",
        "verb",
        "adjective",
        "adverb",
        "preposition",
        "pronoun",
        "article",
        "conjunction",
    } <= parts_of_speech


def test_available_nodes_exposes_noun_plural_and_case_forms():
    response = client.get("/api/grammar/available-nodes?limit=300")

    assert response.status_code == 200
    nodes = response.json()
    katze_nodes = [node for node in nodes if node.get("lemma") == "Katze"]
    katze_labels = {node["label"] for node in katze_nodes}
    katze_meta = {(node["label"], node["meta"]["case"], node["meta"]["number"]) for node in katze_nodes}

    assert "Die Katze" in katze_labels
    assert "Die Katzen" in katze_labels
    assert ("Die Katzen", "nominative", "plural") in katze_meta
    assert any(node["surface_form"] == node["label"] for node in katze_nodes)

    hund_labels = {node["label"] for node in nodes if node.get("lemma") == "Hund"}
    assert "den Hunden" in hund_labels
    assert "den Hunde" not in hund_labels


def test_available_nodes_exposes_present_verb_conjugations():
    response = client.get("/api/grammar/available-nodes?limit=300")

    assert response.status_code == 200
    nodes = response.json()
    gehen_nodes = [node for node in nodes if node.get("lemma") == "gehen" and node["type"] == "predicate"]
    forms = {(node["label"], node["meta"]["pronoun"], node["meta"]["tense"]) for node in gehen_nodes}

    assert ("gehe", "ich", "present") in forms
    assert ("geht", "er/sie/es", "present") in forms
    assert ("gehen", "wir", "present") in forms


def test_available_nodes_exposes_prepositions_and_adverbs_as_sentence_tokens():
    response = client.get("/api/grammar/available-nodes?limit=300")

    assert response.status_code == 200
    nodes = response.json()

    assert any(node["type"] == "preposition" and node["label"] == "in" for node in nodes)
    assert any(node["type"] == "adverb" and node["label"] == "heute" for node in nodes)


def test_available_nodes_exposes_articles_and_conjunctions_as_sentence_tokens():
    response = client.get("/api/grammar/available-nodes?limit=360")

    assert response.status_code == 200
    nodes = response.json()

    assert any(node["type"] == "article" and node["label"] == "der" for node in nodes)
    assert any(node["type"] == "article" and node["label"] == "eine" for node in nodes)
    assert any(node["type"] == "conjunction" and node["label"] == "und" for node in nodes)
    assert any(node["type"] == "conjunction" and node["label"] == "weil" for node in nodes)


def test_available_nodes_prioritizes_function_words_for_sentence_building():
    response = client.get("/api/grammar/available-nodes?limit=360")

    assert response.status_code == 200
    nodes = response.json()
    counts = {}
    for node in nodes:
        counts[node["type"]] = counts.get(node["type"], 0) + 1

    assert counts["adverb"] >= 24
    assert counts["preposition"] >= 18
    assert counts["pronoun"] >= 12
    assert counts["article"] >= 8
    assert counts["conjunction"] >= 12
