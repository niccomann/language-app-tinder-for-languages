from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.database.connection import DatabaseConnection
from app.main import app


DatabaseConnection().create_database_and_tables()
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


def test_learning_summary_tracks_average_level_trend_and_inactivity():
    from app.services import adaptive_learning

    now = datetime(2026, 5, 6, 12, 0, tzinfo=UTC)
    stats = [
        SimpleNamespace(confidence_score=0, times_seen=1, last_practiced=now - timedelta(days=5)),
        SimpleNamespace(confidence_score=35, times_seen=3, last_practiced=now - timedelta(days=4)),
        SimpleNamespace(confidence_score=85, times_seen=8, last_practiced=now - timedelta(days=5)),
    ]

    summary = adaptive_learning.build_learning_summary(
        stats,
        now=now,
        previous_average_knowledge_level=3.2,
    )

    assert summary["average_confidence"] == 40.0
    assert summary["average_knowledge_level"] == 4.7
    assert summary["total_words_practiced"] == 3
    assert summary["total_practice_sessions"] == 12
    assert summary["words_struggling"] == 1
    assert summary["words_learning"] == 1
    assert summary["words_mastered"] == 1
    assert summary["trend"] == "improving"
    assert summary["level_delta"] == 1.5
    assert summary["days_since_last_practice"] == 4
    assert summary["should_reengage"] is True


def test_learning_summary_empty_state_is_stable_for_new_user():
    from app.services import adaptive_learning

    summary = adaptive_learning.build_learning_summary([], now=datetime(2026, 5, 6, 12, 0, tzinfo=UTC))

    assert summary["average_confidence"] == 0.0
    assert summary["average_knowledge_level"] == 1.0
    assert summary["total_words_practiced"] == 0
    assert summary["trend"] == "new"
    assert summary["days_since_last_practice"] is None
    assert summary["should_reengage"] is False


def test_learning_summary_endpoint_returns_adaptive_dashboard_contract():
    response = client.get("/api/statistics/adaptive-summary?language=zz&user_id=summary-contract-test")

    assert response.status_code == 200
    data = response.json()
    assert {
        "average_confidence",
        "average_knowledge_level",
        "total_words_practiced",
        "total_practice_sessions",
        "words_struggling",
        "words_learning",
        "words_mastered",
        "trend",
        "level_delta",
        "days_since_last_practice",
        "should_reengage",
    } <= set(data)
    assert data["trend"] == "new"
    assert data["average_knowledge_level"] == 1.0
