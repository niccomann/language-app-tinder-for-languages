"""Smoke test: SubtitleEntity + MovieEntity + SubtitleStatsEntity + IngestionLogEntity
import successfully, declare correct tablenames, and persist roundtrip on SQLite."""

from sqlmodel import Session, SQLModel, create_engine, select

from app.database.models import (
    MovieEntity,
    SubtitleEntity,
    SubtitleStatsEntity,
    IngestionLogEntity,
)


def test_subtitle_entities_roundtrip(tmp_path):
    db_file = tmp_path / "smoke.db"
    engine = create_engine(f"sqlite:///{db_file}")
    SQLModel.metadata.create_all(engine)

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

        loaded = session.exec(select(SubtitleEntity).where(SubtitleEntity.movie_id == movie.id)).one()
        assert loaded.full_text.startswith("Wache auf")
        assert loaded.validated_at is None  # default
