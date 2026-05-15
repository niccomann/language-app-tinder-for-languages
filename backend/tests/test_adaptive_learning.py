from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlmodel import select

from app.database.connection import DatabaseConnection
from app.database.models import FlashcardEntity
from app.main import app


DatabaseConnection().create_database_and_tables()


def ensure_adaptive_test_flashcards():
    with DatabaseConnection().session as session:
        existing = session.exec(
            select(FlashcardEntity).where(FlashcardEntity.language == "de")
        ).first()
        if existing:
            return

        session.add_all([
            FlashcardEntity(
                word="Computer",
                translation="computer",
                image_url="",
                language="de",
                category="technology",
                thematic_domain="technology",
                part_of_speech="noun",
                frequency_band="common",
                cefr_level="A1",
                language_register="neutral",
            ),
            FlashcardEntity(
                word="arbeiten",
                translation="to work",
                image_url="",
                language="de",
                category="work",
                thematic_domain="work",
                part_of_speech="verb",
                frequency_band="common",
                cefr_level="A1",
                language_register="neutral",
            ),
            FlashcardEntity(
                word="der",
                translation="the",
                image_url="",
                language="de",
                category="function_words",
                thematic_domain="grammar",
                part_of_speech="article",
                frequency_band="very_common",
                cefr_level="A1",
                language_register="neutral",
            ),
        ])
        session.commit()


ensure_adaptive_test_flashcards()
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


def test_preference_profile_adaptive_query_prioritizes_selected_domain():
    response = client.post(
        "/api/cards/adaptive/query",
        json={
            "language": "de",
            "limit": 30,
            "profile": {
                "domains": ["technology"],
                "tones": ["friendly"],
                "wordStyles": ["modern"],
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data
    assert any(card["category"] == "technology" for card in data[:10])


def test_preference_profile_adaptive_query_keeps_functional_words_available():
    response = client.post(
        "/api/cards/adaptive/query",
        json={
            "language": "de",
            "limit": 40,
            "profile": {
                "domains": ["technology"],
                "preferredPartsOfSpeech": ["noun", "verb"],
            },
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data
    assert any(
        card.get("part_of_speech") in {"article", "pronoun", "preposition", "conjunction", "adverb", "particle"}
        or card["category"] == "function_words"
        for card in data
    )


def test_semantic_diversity_mode_makes_preference_profile_active():
    from app.models import LearningPreferenceProfile
    from app.services.preference_filter import has_active_profile

    assert has_active_profile(LearningPreferenceProfile(semanticDiversityMode="wide")) is True


def test_wide_semantic_diversity_spreads_adjacent_categories():
    from app.models import LearningPreferenceProfile
    from app.services.preference_filter import select_preference_weighted_candidates

    def make_item(item_id: int, category: str):
        candidate = SimpleNamespace(
            id=item_id,
            confidence_score=0,
            times_seen=0,
            last_practiced=None,
        )
        card = SimpleNamespace(
            id=item_id,
            word=f"word-{item_id}",
            category=category,
            thematic_domain=category,
            part_of_speech="noun",
            frequency_band="common",
            cefr_level="A1",
            language_register="neutral",
        )
        return (candidate, card, None)

    candidates = [
        make_item(1, "technology"),
        make_item(2, "technology"),
        make_item(3, "food"),
        make_item(4, "food"),
    ]

    selected = select_preference_weighted_candidates(
        candidates,
        LearningPreferenceProfile(semanticDiversityMode="wide"),
        4,
        lambda candidate: (0, 0.0, 0, candidate.id),
    )

    assert [item[1].category for item in selected] == [
        "technology",
        "food",
        "technology",
        "food",
    ]


def test_progress_isolated_by_user_id():
    card_id = "pytest-progress-isolation-card"
    users = ["pytest-progress-a", "pytest-progress-b"]

    for user_id in users:
        reset_response = client.post(f"/api/progress/reset?user_id={user_id}")
        assert reset_response.status_code == 200

    first_response = client.post(
        "/api/progress",
        json={"card_id": card_id, "known": True, "user_id": users[0]},
    )
    second_response = client.post(
        "/api/progress",
        json={"card_id": card_id, "known": False, "user_id": users[1]},
    )

    assert first_response.status_code == 200
    assert second_response.status_code == 200

    first_progress = client.get(f"/api/progress?user_id={users[0]}").json()
    second_progress = client.get(f"/api/progress?user_id={users[1]}").json()

    assert first_progress == {"cards_reviewed": 1, "known_count": 1, "unknown_count": 0}
    assert second_progress == {"cards_reviewed": 1, "known_count": 0, "unknown_count": 1}


def test_learning_summary_tracks_average_level_trend_and_inactivity():
    from app.services import adaptive_learning

    now = datetime(2026, 5, 6, 12, 0, tzinfo=UTC)
    stats = [
        SimpleNamespace(confidence_score=0, times_seen=1, times_correct=0, times_incorrect=1, last_practiced=now - timedelta(days=5)),
        SimpleNamespace(confidence_score=35, times_seen=3, times_correct=2, times_incorrect=1, last_practiced=now - timedelta(days=4)),
        SimpleNamespace(confidence_score=85, times_seen=8, times_correct=8, times_incorrect=0, last_practiced=now - timedelta(days=5)),
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
    assert summary["path_xp"] == 192
    assert summary["path_level"] == 2
    assert summary["max_path_level"] == 400
    assert summary["xp_to_next_level"] == 8
    assert summary["path_level_progress"] == 92.0


def test_learning_summary_caps_global_path_level_at_four_hundred():
    from app.services import adaptive_learning

    stats = [
        SimpleNamespace(
            confidence_score=100,
            times_seen=5000,
            times_correct=5000,
            times_incorrect=0,
            last_practiced=datetime(2026, 5, 6, 12, 0, tzinfo=UTC),
        )
    ]

    summary = adaptive_learning.build_learning_summary(stats, now=datetime(2026, 5, 6, 12, 0, tzinfo=UTC))

    assert summary["path_level"] == 400
    assert summary["max_path_level"] == 400
    assert summary["xp_to_next_level"] == 0
    assert summary["path_level_progress"] == 100.0


def test_learning_summary_empty_state_is_stable_for_new_user():
    from app.services import adaptive_learning

    summary = adaptive_learning.build_learning_summary([], now=datetime(2026, 5, 6, 12, 0, tzinfo=UTC))

    assert summary["average_confidence"] == 0.0
    assert summary["average_knowledge_level"] == 1.0
    assert summary["total_words_practiced"] == 0
    assert summary["path_xp"] == 0
    assert summary["path_level"] == 1
    assert summary["max_path_level"] == 400
    assert summary["xp_to_next_level"] == 100
    assert summary["path_level_progress"] == 0.0
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
        "path_xp",
        "path_level",
        "max_path_level",
        "xp_to_next_level",
        "path_level_progress",
        "trend",
        "level_delta",
        "days_since_last_practice",
        "should_reengage",
    } <= set(data)
    assert data["trend"] == "new"
    assert data["average_knowledge_level"] == 1.0
    assert data["path_level"] == 1
    assert data["max_path_level"] == 400
