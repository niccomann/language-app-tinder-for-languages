from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_confidence_score_maps_to_ten_point_knowledge_level():
    from app.services import adaptive_learning

    assert adaptive_learning.knowledge_level_from_confidence(0) == 1
    assert adaptive_learning.knowledge_level_from_confidence(9) == 1
    assert adaptive_learning.knowledge_level_from_confidence(10) == 2
    assert adaptive_learning.knowledge_level_from_confidence(89) == 9
    assert adaptive_learning.knowledge_level_from_confidence(90) == 10
    assert adaptive_learning.knowledge_level_from_confidence(100) == 10


def test_swipes_move_confidence_with_bounded_deltas():
    from app.services import adaptive_learning

    assert adaptive_learning.next_confidence_score(0, correct=True) == 12
    assert adaptive_learning.next_confidence_score(95, correct=True) == 100
    assert adaptive_learning.next_confidence_score(50, correct=False) == 32
    assert adaptive_learning.next_confidence_score(10, correct=False) == 0


def test_adaptive_sort_prioritizes_weak_new_learning_then_mastered_cards():
    from app.services import adaptive_learning

    now = datetime.now(UTC)
    candidates = [
        SimpleNamespace(id=1, word="mastered", confidence_score=92, times_seen=9, last_practiced=now),
        SimpleNamespace(id=2, word="new", confidence_score=0, times_seen=0, last_practiced=None),
        SimpleNamespace(id=3, word="weak", confidence_score=20, times_seen=3, last_practiced=now - timedelta(days=4)),
        SimpleNamespace(id=4, word="learning", confidence_score=55, times_seen=5, last_practiced=now - timedelta(days=2)),
    ]

    sorted_words = [
        candidate.word
        for candidate in sorted(candidates, key=adaptive_learning.adaptive_sort_key)
    ]

    assert sorted_words == ["weak", "new", "learning", "mastered"]
    assert adaptive_learning.selection_reason(candidates[0]) == "review"
    assert adaptive_learning.selection_reason(candidates[1]) == "new"
    assert adaptive_learning.selection_reason(candidates[2]) == "struggling"
    assert adaptive_learning.selection_reason(candidates[3]) == "learning"


def test_adaptive_cards_endpoint_returns_learning_metadata():
    response = client.get("/api/cards/adaptive?language=de&limit=5")

    assert response.status_code == 200
    data = response.json()
    assert 1 <= len(data) <= 5
    assert {"knowledge_level", "confidence_score", "times_seen", "selection_reason"} <= set(data[0])
    assert 1 <= data[0]["knowledge_level"] <= 10
    assert 0 <= data[0]["confidence_score"] <= 100


def test_adaptive_cards_endpoint_respects_category_filters():
    cards_response = client.get("/api/cards?language=de&limit=100")
    assert cards_response.status_code == 200

    categories = [card["category"] for card in cards_response.json() if card.get("category")]
    assert categories

    selected_category = categories[0]
    response = client.get(f"/api/cards/adaptive?language=de&category={selected_category}&limit=20")

    assert response.status_code == 200
    data = response.json()
    assert data
    assert {card["category"] for card in data} == {selected_category}
