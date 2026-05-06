"""
Library API routes for rich word exploration.
Provides filtered access to flashcards with all linguistic data.
"""
import json
from fastapi import APIRouter, HTTPException, Query
from typing import Any, Optional, List
from sqlalchemy import text
from sqlmodel import select, func

from app.models import (
    FlashcardEnriched,
    FlashcardDetail,
    FlashcardWithProgress,
    LibraryFilters,
    LibraryStats,
    Etymology,
    ExampleSentence,
    FalseFriend,
    Proverb,
    Collocation,
    DialectVariant,
)
from app.database import SessionDependency
from app.database.models import (
    FlashcardEntity,
    UserProgressEntity,
    EtymologyEntity,
    ExampleSentenceEntity,
    FalseFriendEntity,
    ProverbEntity,
    CollocationEntity,
)

router = APIRouter(prefix="/api/library", tags=["library"])

MEDIA_COLUMNS = {"image_base64", "audio_base64"}


def parse_extra_data(extra_data_str: Optional[str]) -> Optional[dict]:
    """Parse extra_data JSON string to dict."""
    if not extra_data_str:
        return None
    try:
        return json.loads(extra_data_str)
    except (json.JSONDecodeError, TypeError):
        return None


def entity_to_enriched(card: FlashcardEntity) -> FlashcardEnriched:
    """Convert FlashcardEntity to FlashcardEnriched model."""
    return FlashcardEnriched(
        id=card.id,
        word=card.word,
        translation=card.translation,
        image_base64=card.image_base64,
        language=card.language,
        difficulty=card.difficulty,
        category=card.category,
        created_at=card.created_at,
        updated_at=card.updated_at,
        cefr_level=card.cefr_level,
        frequency_band=card.frequency_band,
        register=card.language_register,
        thematic_domain=card.thematic_domain,
        part_of_speech=card.part_of_speech,
        gender=card.gender,
        plural_form=card.plural_form,
        is_compound=card.is_compound,
        word_formation=card.word_formation,
        extra_data=parse_extra_data(card.extra_data),
    )


def row_to_dict(row: Any) -> dict:
    return dict(row) if row else {}


def fetch_one_mapping(session: SessionDependency, query: str, params: Optional[dict] = None) -> Optional[dict]:
    row = session.execute(text(query), params or {}).mappings().first()
    return row_to_dict(row) if row else None


def fetch_all_mappings(session: SessionDependency, query: str, params: Optional[dict] = None) -> list[dict]:
    rows = session.execute(text(query), params or {}).mappings().all()
    return [row_to_dict(row) for row in rows]


def fetch_producer_word_for_card(session: SessionDependency, card: FlashcardEntity) -> Optional[dict]:
    return fetch_one_mapping(
        session,
        """
        SELECT w.*
        FROM words w
        WHERE w.word = :word AND w.language = :language
        ORDER BY CASE WHEN w.id = :card_id THEN 0 ELSE 1 END, w.id
        LIMIT 1
        """,
        {"word": card.word, "language": card.language, "card_id": card.id},
    )


def count_words_with_related_rows(
    session: SessionDependency,
    relation_table: str,
    language: Optional[str],
) -> int:
    allowed_tables = {"etymologies", "example_sentences", "false_friends", "proverbs"}
    if relation_table not in allowed_tables:
        raise ValueError(f"Unsupported relation table: {relation_table}")

    row = fetch_one_mapping(
        session,
        f"""
        SELECT COUNT(DISTINCT w.id) AS count
        FROM words w
        JOIN flashcards f ON f.word = w.word AND f.language = w.language
        WHERE (:language IS NULL OR w.language = :language)
          AND EXISTS (
            SELECT 1 FROM {relation_table} related
            WHERE related.word_id = w.id
          )
        """,
        {"language": language},
    )
    return int(row["count"]) if row else 0


def fetch_detail_related_rows(session: SessionDependency, word_id: Optional[int]) -> dict[str, list[dict]]:
    if word_id is None:
        return {
            "etymologies": [],
            "examples": [],
            "false_friends": [],
            "proverbs": [],
            "collocations": [],
            "dialect_variants": [],
        }

    params = {"word_id": word_id}
    return {
        "etymologies": fetch_all_mappings(
            session,
            """
            SELECT id, origin_language, origin_word, etymology_text, language_family, time_period
            FROM etymologies
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "examples": fetch_all_mappings(
            session,
            """
            SELECT id, sentence, translation, difficulty_level, context_type
            FROM example_sentences
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "false_friends": fetch_all_mappings(
            session,
            """
            SELECT id, target_language, similar_word, similar_word_meaning, confusion_level
            FROM false_friends
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "proverbs": fetch_all_mappings(
            session,
            """
            SELECT id, expression, literal_meaning, figurative_meaning, expression_type
            FROM proverbs
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "collocations": fetch_all_mappings(
            session,
            """
            SELECT id, collocate_word, collocation_type, example_phrase, frequency
            FROM collocations
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
        "dialect_variants": fetch_all_mappings(
            session,
            """
            SELECT id, region, dialect_name, variant_word, pronunciation_ipa AS pronunciation, usage_notes
            FROM dialect_variants
            WHERE word_id = :word_id
            ORDER BY id
            """,
            params,
        ),
    }


def media_summary(row: dict) -> dict:
    image_base64 = row.get("image_base64")
    audio_base64 = row.get("audio_base64")
    return {
        "has_image_base64": bool(image_base64),
        "image_base64_length": len(image_base64 or ""),
        "has_audio_base64": bool(audio_base64),
        "audio_base64_length": len(audio_base64 or ""),
    }


def remove_media_columns(row: dict) -> dict:
    return {key: value for key, value in row.items() if key not in MEDIA_COLUMNS}


def fetch_full_related_rows(session: SessionDependency, word_id: int) -> dict[str, list[dict]]:
    params = {"word_id": word_id}
    related = {
        "translation_family": fetch_all_mappings(
            session,
            """
            WITH selected_word AS (
                SELECT COALESCE(source_word_id, id) AS concept_source_word_id
                FROM words
                WHERE id = :word_id
            )
            SELECT
                w.id,
                w.word,
                w.language,
                w.translation_en,
                w.translation_it,
                w.source_word_id,
                w.is_ground_truth,
                w.derived_from_language,
                w.part_of_speech,
                w.gender,
                w.plural_form
            FROM words w
            CROSS JOIN selected_word selected
            WHERE w.id = selected.concept_source_word_id
               OR w.source_word_id = selected.concept_source_word_id
            ORDER BY w.is_ground_truth DESC, w.language, w.word
            """,
            params,
        ),
        "example_sentences": fetch_all_mappings(
            session,
            "SELECT * FROM example_sentences WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "etymologies": fetch_all_mappings(
            session,
            "SELECT * FROM etymologies WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "curiosities": fetch_all_mappings(
            session,
            "SELECT * FROM curiosities WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "collocations": fetch_all_mappings(
            session,
            "SELECT * FROM collocations WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "verb_conjugations": fetch_all_mappings(
            session,
            """
            SELECT *
            FROM verb_conjugations
            WHERE word_id = :word_id
            ORDER BY
                CASE mood
                    WHEN 'indicative' THEN 1
                    WHEN 'subjunctive' THEN 2
                    WHEN 'imperative' THEN 3
                    ELSE 9
                END,
                CASE tense
                    WHEN 'present' THEN 1
                    WHEN 'preterite' THEN 2
                    WHEN 'perfect' THEN 3
                    WHEN 'future_1' THEN 4
                    ELSE 9
                END,
                CASE number WHEN 'singular' THEN 1 ELSE 2 END,
                person,
                id
            """,
            params,
        ),
        "false_friends": fetch_all_mappings(
            session,
            "SELECT * FROM false_friends WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "proverbs": fetch_all_mappings(
            session,
            "SELECT * FROM proverbs WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "dialect_variants": fetch_all_mappings(
            session,
            "SELECT * FROM dialect_variants WHERE word_id = :word_id ORDER BY id",
            params,
        ),
        "word_relations": fetch_all_mappings(
            session,
            """
            SELECT wr.*, source.word AS source_word, target.word AS target_word
            FROM word_relations wr
            JOIN words source ON source.id = wr.source_word_id
            JOIN words target ON target.id = wr.target_word_id
            WHERE wr.source_word_id = :word_id OR wr.target_word_id = :word_id
            ORDER BY wr.id
            """,
            params,
        ),
    }
    return related


@router.get("/filters", response_model=LibraryFilters)
async def get_available_filters(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get all available filter options for the library.
    Returns distinct values for each filterable field.
    """
    base_query = select(FlashcardEntity)
    if language:
        base_query = base_query.where(FlashcardEntity.language == language)
    
    flashcards = session.exec(base_query).all()
    
    cefr_levels = sorted(set(f.cefr_level for f in flashcards if f.cefr_level))
    frequency_bands = sorted(set(f.frequency_band for f in flashcards if f.frequency_band))
    registers = sorted(set(f.language_register for f in flashcards if f.language_register))
    genders = sorted(set(f.gender for f in flashcards if f.gender))
    parts_of_speech = sorted(set(f.part_of_speech for f in flashcards if f.part_of_speech))
    word_formations = sorted(set(f.word_formation for f in flashcards if f.word_formation))
    categories = sorted(set(f.category for f in flashcards if f.category))
    thematic_domains = sorted(set(f.thematic_domain for f in flashcards if f.thematic_domain))
    
    return LibraryFilters(
        cefr_levels=cefr_levels,
        frequency_bands=frequency_bands,
        registers=registers,
        genders=genders,
        parts_of_speech=parts_of_speech,
        word_formations=word_formations,
        categories=categories,
        thematic_domains=thematic_domains,
    )


@router.get("/stats", response_model=LibraryStats)
async def get_library_stats(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get statistics about the word library.
    """
    base_query = select(FlashcardEntity)
    if language:
        base_query = base_query.where(FlashcardEntity.language == language)
    
    flashcards = session.exec(base_query).all()
    
    words_with_etymology = count_words_with_related_rows(session, "etymologies", language)
    words_with_examples = count_words_with_related_rows(session, "example_sentences", language)
    words_with_false_friends = count_words_with_related_rows(session, "false_friends", language)
    words_with_proverbs = count_words_with_related_rows(session, "proverbs", language)
    
    by_cefr_level = {}
    by_gender = {}
    by_part_of_speech = {}
    
    for card in flashcards:
        if card.cefr_level:
            by_cefr_level[card.cefr_level] = by_cefr_level.get(card.cefr_level, 0) + 1
        if card.gender:
            by_gender[card.gender] = by_gender.get(card.gender, 0) + 1
        if card.part_of_speech:
            by_part_of_speech[card.part_of_speech] = by_part_of_speech.get(card.part_of_speech, 0) + 1
    
    return LibraryStats(
        total_words=len(flashcards),
        words_with_etymology=words_with_etymology,
        words_with_examples=words_with_examples,
        words_with_false_friends=words_with_false_friends,
        words_with_proverbs=words_with_proverbs,
        by_cefr_level=by_cefr_level,
        by_gender=by_gender,
        by_part_of_speech=by_part_of_speech,
    )


@router.get("/words", response_model=List[FlashcardWithProgress])
async def get_library_words(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
    search: Optional[str] = Query(None, description="Search in word or translation"),
    category: Optional[str] = Query(None, description="Filter by category"),
    cefr_level: Optional[str] = Query(None, description="Filter by CEFR level (A1-C2)"),
    frequency_band: Optional[str] = Query(None, description="Filter by frequency"),
    register: Optional[str] = Query(None, description="Filter by register"),
    gender: Optional[str] = Query(None, description="Filter by gender (masculine/feminine/neuter)"),
    part_of_speech: Optional[str] = Query(None, description="Filter by part of speech"),
    is_compound: Optional[bool] = Query(None, description="Filter compound words"),
    word_formation: Optional[str] = Query(None, description="Filter by word formation type"),
    status: Optional[str] = Query(None, description="Filter by learning status: known/unknown"),
    limit: Optional[int] = Query(100, description="Limit results"),
    offset: Optional[int] = Query(0, description="Offset for pagination"),
):
    """
    Get flashcards with advanced filters and progress information.
    Supports filtering by all linguistic attributes.
    """
    query = select(FlashcardEntity)
    
    if language:
        query = query.where(FlashcardEntity.language == language)
    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.where(
            (func.lower(FlashcardEntity.word).like(search_pattern)) |
            (func.lower(FlashcardEntity.translation).like(search_pattern))
        )
    if category:
        query = query.where(FlashcardEntity.category == category)
    if cefr_level:
        query = query.where(FlashcardEntity.cefr_level == cefr_level)
    if frequency_band:
        query = query.where(FlashcardEntity.frequency_band == frequency_band)
    if register:
        query = query.where(FlashcardEntity.language_register == register)
    if gender:
        query = query.where(FlashcardEntity.gender == gender)
    if part_of_speech:
        query = query.where(FlashcardEntity.part_of_speech == part_of_speech)
    if is_compound is not None:
        query = query.where(FlashcardEntity.is_compound == is_compound)
    if word_formation:
        query = query.where(FlashcardEntity.word_formation == word_formation)
    
    query = query.offset(offset).limit(limit)
    flashcards = session.exec(query).all()
    
    progress_records = session.exec(select(UserProgressEntity)).all()
    progress_map = {record.card_id: record for record in progress_records}
    
    result = []
    for card in flashcards:
        card_id = str(card.id)
        progress = progress_map.get(card_id)
        
        if status == "known" and (not progress or not progress.known):
            continue
        elif status == "unknown" and (not progress or progress.known):
            continue
        
        result.append(FlashcardWithProgress(
            id=card.id,
            word=card.word,
            translation=card.translation,
            image_base64=card.image_base64,
            language=card.language,
            difficulty=card.difficulty,
            category=card.category,
            created_at=card.created_at,
            updated_at=card.updated_at,
            cefr_level=card.cefr_level,
            frequency_band=card.frequency_band,
            register=card.language_register,
            thematic_domain=card.thematic_domain,
            part_of_speech=card.part_of_speech,
            gender=card.gender,
            plural_form=card.plural_form,
            is_compound=card.is_compound,
            word_formation=card.word_formation,
            extra_data=parse_extra_data(card.extra_data),
            known=progress.known if progress else None,
            review_count=progress.review_count if progress else None,
            swipe_right_count=progress.swipe_right_count if progress else None,
            swipe_left_count=progress.swipe_left_count if progress else None,
            last_reviewed=progress.last_reviewed if progress else None,
        ))
    
    return result


@router.get("/words/{word_id}", response_model=FlashcardDetail)
async def get_word_detail(
    session: SessionDependency,
    word_id: int,
):
    """
    Get complete word detail with all relational data.
    Includes etymology, examples, false friends, proverbs, collocations, dialect variants.
    """
    card = session.exec(
        select(FlashcardEntity).where(FlashcardEntity.id == word_id)
    ).first()
    
    if not card:
        raise HTTPException(status_code=404, detail="Word not found")

    producer_word = fetch_producer_word_for_card(session, card)
    producer_word_id = producer_word["id"] if producer_word else None
    related = fetch_detail_related_rows(session, producer_word_id)
    
    return FlashcardDetail(
        id=card.id,
        word=card.word,
        translation=card.translation,
        image_base64=card.image_base64,
        language=card.language,
        difficulty=card.difficulty,
        category=card.category,
        created_at=card.created_at,
        updated_at=card.updated_at,
        cefr_level=card.cefr_level,
        frequency_band=card.frequency_band,
        register=card.language_register,
        thematic_domain=card.thematic_domain,
        part_of_speech=card.part_of_speech,
        gender=card.gender,
        plural_form=card.plural_form,
        is_compound=card.is_compound,
        word_formation=card.word_formation,
        image_coherence_score=card.image_coherence_score,
        pronunciation_ipa=card.pronunciation_ipa,
        example_sentence=card.example_sentence,
        etymology_text=card.etymology_text,
        visual_mnemonic=card.visual_mnemonic,
        memory_hook=card.memory_hook,
        extra_data=parse_extra_data(card.extra_data),
        etymologies=[
            Etymology(
                id=e.get("id"),
                origin_language=e.get("origin_language"),
                origin_word=e.get("origin_word"),
                etymology_text=e.get("etymology_text"),
                language_family=e.get("language_family"),
                time_period=e.get("time_period"),
            ) for e in related["etymologies"]
        ],
        examples=[
            ExampleSentence(
                id=e.get("id"),
                sentence=e.get("sentence"),
                translation=e.get("translation"),
                difficulty_level=e.get("difficulty_level"),
                context_type=e.get("context_type"),
            ) for e in related["examples"]
        ],
        false_friends=[
            FalseFriend(
                id=f.get("id"),
                target_language=f.get("target_language"),
                similar_word=f.get("similar_word"),
                similar_word_meaning=f.get("similar_word_meaning"),
                confusion_level=f.get("confusion_level"),
            ) for f in related["false_friends"]
        ],
        proverbs=[
            Proverb(
                id=p.get("id"),
                expression=p.get("expression"),
                literal_meaning=p.get("literal_meaning"),
                figurative_meaning=p.get("figurative_meaning"),
                expression_type=p.get("expression_type"),
            ) for p in related["proverbs"]
        ],
        collocations=[
            Collocation(
                id=c.get("id"),
                collocate_word=c.get("collocate_word"),
                collocation_type=c.get("collocation_type"),
                example_phrase=c.get("example_phrase"),
                frequency=c.get("frequency"),
            ) for c in related["collocations"]
        ],
        dialect_variants=[
            DialectVariant(
                id=d.get("id"),
                region=d.get("region"),
                dialect_name=d.get("dialect_name"),
                variant_word=d.get("variant_word"),
                pronunciation=d.get("pronunciation"),
                usage_notes=d.get("usage_notes"),
            ) for d in related["dialect_variants"]
        ],
    )


@router.get("/words/{word_id}/db-row")
async def get_word_db_row(
    session: SessionDependency,
    word_id: int,
):
    """
    Return the complete producer-schema row for database review.
    Large media blobs are summarized separately so the UI can inspect fields safely.
    """
    card = session.exec(
        select(FlashcardEntity).where(FlashcardEntity.id == word_id)
    ).first()

    if not card:
        raise HTTPException(status_code=404, detail="Word not found")

    producer_word = fetch_producer_word_for_card(session, card)
    if not producer_word:
        raise HTTPException(status_code=404, detail="Producer word row not found")

    return {
        "flashcard": {
            "id": card.id,
            "word": card.word,
            "language": card.language,
            "translation": card.translation,
        },
        "word": remove_media_columns(producer_word),
        "media": media_summary(producer_word),
        "related": fetch_full_related_rows(session, producer_word["id"]),
    }


@router.get("/dialects")
async def get_dialect_words(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get all words that have dialect variants.
    Returns words with their regional dialect variants for the DialectMap feature.
    """
    rows = fetch_all_mappings(
        session,
        """
        SELECT
            w.id AS word_id,
            w.word,
            COALESCE(f.translation, w.translation_en, w.translation_it, '') AS translation,
            d.region,
            d.dialect_name,
            d.variant_word,
            d.pronunciation_ipa AS pronunciation
        FROM words w
        JOIN dialect_variants d ON d.word_id = w.id
        LEFT JOIN flashcards f ON f.word = w.word AND f.language = w.language
        WHERE (:language IS NULL OR w.language = :language)
        ORDER BY w.word, d.region, d.id
        """,
        {"language": language},
    )

    grouped: dict[int, dict[str, Any]] = {}
    for row in rows:
        word_id = int(row["word_id"])
        entry = grouped.setdefault(
            word_id,
            {
                "standardGerman": row["word"],
                "translation": row["translation"],
                "variants": [],
            },
        )
        region = row["region"] or ""
        entry["variants"].append(
            {
                "region": region,
                "regionId": region.lower().replace(" ", "_").replace("/", "_"),
                "dialect": row["dialect_name"] or region,
                "variant": row["variant_word"],
                "pronunciation": row["pronunciation"],
            }
        )

    return list(grouped.values())
