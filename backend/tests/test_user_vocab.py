import pytest
from sqlmodel import Session, SQLModel, create_engine

from app.database.models import FlashcardEntity, UserWordStatisticsEntity
from app.services.user_vocab import extract_user_vocab


@pytest.fixture
def session():
    engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_extract_user_vocab_returns_normalized_weights_for_known_flashcard_words(session):
    session.add_all(
        [
            FlashcardEntity(word="Hund", translation="dog", image_url="", language="de"),
            FlashcardEntity(word="Katze", translation="cat", image_url="", language="de"),
            FlashcardEntity(word="Haus", translation="house", image_url="", language="de"),
            UserWordStatisticsEntity(
                user_id="u1",
                word="Hund",
                language="de",
                confidence_score=90,
                times_seen=12,
            ),
            UserWordStatisticsEntity(
                user_id="u1",
                word="katze",
                language="de",
                confidence_score=40,
                times_seen=2,
            ),
            UserWordStatisticsEntity(
                user_id="u1",
                word="haus",
                language="de",
                confidence_score=0,
                times_seen=1,
            ),
            UserWordStatisticsEntity(
                user_id="u1",
                word="ghost",
                language="de",
                confidence_score=100,
                times_seen=20,
            ),
        ]
    )
    session.commit()

    vocab = extract_user_vocab(session, user_id="u1", language="de")

    assert set(vocab) == {"hund", "katze", "haus"}
    assert sum(vocab.values()) == pytest.approx(1.0)
    assert vocab["hund"] > vocab["katze"] > vocab["haus"]


def test_extract_user_vocab_returns_empty_dict_for_unknown_user(session):
    session.add(FlashcardEntity(word="Hund", translation="dog", image_url="", language="de"))
    session.commit()

    assert extract_user_vocab(session, user_id="unknown", language="de") == {}
