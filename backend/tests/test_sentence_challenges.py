from app.main import app
from fastapi.testclient import TestClient


def test_sentence_challenges_are_served_from_ground_truth_table():
    with TestClient(app) as client:
        response = client.get("/api/grammar/sentence-challenges?language=de")

    assert response.status_code == 200
    challenges = response.json()
    assert len(challenges) >= 3

    first = challenges[0]
    assert first["prompt"]
    assert first["correct_sentence"]
    assert first["correct_tokens"]
    assert first["distractor_tokens"]
    assert first["option_tokens"]
    assert 6 <= len(first["option_tokens"]) <= 12
    assert first["validation_mode"] == "ground_truth"
    assert first["correct_tokens"] == ["Ich", "habe", "den Hund"]
    assert first["option_tokens"][:len(first["correct_tokens"])] != first["correct_tokens"]
    assert "OPENAI" not in response.text


def test_sentence_challenge_options_are_stable_between_requests():
    with TestClient(app) as client:
        first_response = client.get("/api/grammar/sentence-challenges?language=de&limit=1")
        second_response = client.get("/api/grammar/sentence-challenges?language=de&limit=1")

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    first_options = first_response.json()[0]["option_tokens"]
    second_options = second_response.json()[0]["option_tokens"]
    assert first_options == second_options


def test_sentence_challenges_prioritize_preferred_grammar_focus():
    with TestClient(app) as client:
        response = client.get(
            "/api/grammar/sentence-challenges"
            "?language=de"
            "&limit=1"
            "&profile_part_of_speech=adverb"
        )

    assert response.status_code == 200
    challenges = response.json()
    assert challenges
    assert "adverb" in challenges[0]["grammar_focus"]
