"""Smoke test: SubtitleEntity + MovieEntity + SubtitleStatsEntity + IngestionLogEntity
import successfully, declare correct tablenames, and persist roundtrip on SQLite.

Also verifies the load-bearing DB constraints:
- UNIQUE(movie_id, language, source) on subtitles
- ON DELETE CASCADE from movies → subtitles
"""

import pytest
from sqlalchemy import event
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, create_engine, select

from app.database.models import (
    IngestionLogEntity,
    MovieEntity,
    SubtitleEntity,
    SubtitleStatsEntity,
)


def _make_engine(db_file):
    """Create a SQLite engine with foreign_keys=ON so cascades actually fire."""
    engine = create_engine(f"sqlite:///{db_file}")

    @event.listens_for(engine, "connect")
    def _fk_on(dbapi_conn, _conn_record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys = ON")
        cur.close()

    SQLModel.metadata.create_all(engine)
    return engine


def test_subtitle_entities_roundtrip(tmp_path):
    engine = _make_engine(tmp_path / "smoke.db")

    with Session(engine) as session:
        movie = MovieEntity(imdb_id="tt0133093", title="The Matrix", year=1999, genres=["sci-fi", "action"])
        session.add(movie)
        session.commit()
        session.refresh(movie)

        sub = SubtitleEntity(
            movie_id=movie.id,
            language="de",
            full_text="Wache auf, Neo. Die Matrix hat dich.",
            source="hf_opensubtitles2024",
            license="ODC-BY",
            external_id="hf-42",
        )
        session.add(sub)
        session.commit()
        session.refresh(sub)

        stats = SubtitleStatsEntity(
            subtitle_id=sub.id,
            word_count=7,
            unique_words=7,
            word_freq_top={"matrix": 1, "neo": 1},
        )
        session.add(stats)

        log = IngestionLogEntity(
            source="hf_opensubtitles2024",
            rows_in=1,
            rows_kept=1,
            rows_rejected=0,
            rejection_reasons={},
        )
        session.add(log)
        session.commit()
        session.refresh(stats)
        session.refresh(log)

        loaded = session.exec(select(SubtitleEntity).where(SubtitleEntity.movie_id == movie.id)).one()
        assert loaded.full_text.startswith("Wache auf")
        assert loaded.validated_at is None  # default

        # JSON column roundtrips
        loaded_movie = session.exec(select(MovieEntity).where(MovieEntity.id == movie.id)).one()
        assert loaded_movie.genres == ["sci-fi", "action"]

        loaded_stats = session.exec(
            select(SubtitleStatsEntity).where(SubtitleStatsEntity.subtitle_id == sub.id)
        ).one()
        assert loaded_stats.word_freq_top == {"matrix": 1, "neo": 1}

        loaded_log = session.exec(select(IngestionLogEntity).where(IngestionLogEntity.id == log.id)).one()
        assert loaded_log.rejection_reasons == {}


def test_unique_constraint_prevents_duplicate_subtitle(tmp_path):
    engine = _make_engine(tmp_path / "unique.db")

    with Session(engine) as session:
        movie = MovieEntity(imdb_id="tt0133093", title="The Matrix", year=1999)
        session.add(movie)
        session.commit()
        session.refresh(movie)

        sub_a = SubtitleEntity(
            movie_id=movie.id,
            language="de",
            full_text="A",
            source="hf_opensubtitles2024",
            license="ODC-BY",
        )
        session.add(sub_a)
        session.commit()

        sub_b = SubtitleEntity(
            movie_id=movie.id,
            language="de",
            full_text="B",
            source="hf_opensubtitles2024",
            license="ODC-BY",
        )
        session.add(sub_b)
        with pytest.raises(IntegrityError):
            session.commit()
        session.rollback()


def test_cascade_delete_removes_subtitles(tmp_path):
    engine = _make_engine(tmp_path / "cascade.db")

    with Session(engine) as session:
        movie = MovieEntity(imdb_id="tt0133093", title="The Matrix", year=1999)
        session.add(movie)
        session.commit()
        session.refresh(movie)
        movie_id = movie.id

        sub = SubtitleEntity(
            movie_id=movie_id,
            language="de",
            full_text="Wache auf, Neo.",
            source="hf_opensubtitles2024",
            license="ODC-BY",
        )
        session.add(sub)
        session.commit()
        session.refresh(sub)

        # Verify there is a subtitle to begin with
        assert session.exec(select(SubtitleEntity).where(SubtitleEntity.movie_id == movie_id)).first() is not None

        session.delete(movie)
        session.commit()

        remaining = session.exec(select(SubtitleEntity).where(SubtitleEntity.movie_id == movie_id)).all()
        assert remaining == []
