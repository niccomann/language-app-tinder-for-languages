"""
Library API routes for rich word exploration.
Provides filtered access to flashcards with all linguistic data.
"""
import json
from fastapi import APIRouter, Query
from typing import Optional, List
from sqlmodel import select, func, distinct

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
    DialectVariantEntity,
)

router = APIRouter(prefix="/api/library", tags=["library"])


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
        register=card.register,
        thematic_domain=card.thematic_domain,
        part_of_speech=card.part_of_speech,
        gender=card.gender,
        plural_form=card.plural_form,
        is_compound=card.is_compound,
        word_formation=card.word_formation,
        extra_data=parse_extra_data(card.extra_data),
    )


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
    registers = sorted(set(f.register for f in flashcards if f.register))
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
    flashcard_ids = [f.id for f in flashcards]
    
    words_with_etymology = session.exec(
        select(func.count(distinct(EtymologyEntity.flashcard_id)))
        .where(EtymologyEntity.flashcard_id.in_(flashcard_ids))
    ).one() if flashcard_ids else 0
    
    words_with_examples = session.exec(
        select(func.count(distinct(ExampleSentenceEntity.flashcard_id)))
        .where(ExampleSentenceEntity.flashcard_id.in_(flashcard_ids))
    ).one() if flashcard_ids else 0
    
    words_with_false_friends = session.exec(
        select(func.count(distinct(FalseFriendEntity.flashcard_id)))
        .where(FalseFriendEntity.flashcard_id.in_(flashcard_ids))
    ).one() if flashcard_ids else 0
    
    words_with_proverbs = session.exec(
        select(func.count(distinct(ProverbEntity.flashcard_id)))
        .where(ProverbEntity.flashcard_id.in_(flashcard_ids))
    ).one() if flashcard_ids else 0
    
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
        query = query.where(FlashcardEntity.register == register)
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
            register=card.register,
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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Word not found")
    
    etymologies = session.exec(
        select(EtymologyEntity).where(EtymologyEntity.flashcard_id == word_id)
    ).all()
    
    examples = session.exec(
        select(ExampleSentenceEntity).where(ExampleSentenceEntity.flashcard_id == word_id)
    ).all()
    
    false_friends = session.exec(
        select(FalseFriendEntity).where(FalseFriendEntity.flashcard_id == word_id)
    ).all()
    
    proverbs = session.exec(
        select(ProverbEntity).where(ProverbEntity.flashcard_id == word_id)
    ).all()
    
    collocations = session.exec(
        select(CollocationEntity).where(CollocationEntity.flashcard_id == word_id)
    ).all()
    
    dialect_variants = session.exec(
        select(DialectVariantEntity).where(DialectVariantEntity.flashcard_id == word_id)
    ).all()
    
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
        register=card.register,
        thematic_domain=card.thematic_domain,
        part_of_speech=card.part_of_speech,
        gender=card.gender,
        plural_form=card.plural_form,
        is_compound=card.is_compound,
        word_formation=card.word_formation,
        extra_data=parse_extra_data(card.extra_data),
        etymologies=[
            Etymology(
                id=e.id,
                origin_language=e.origin_language,
                origin_word=e.origin_word,
                etymology_text=e.etymology_text,
                language_family=e.language_family,
                time_period=e.time_period,
                extra_data=parse_extra_data(e.extra_data),
            ) for e in etymologies
        ],
        examples=[
            ExampleSentence(
                id=e.id,
                sentence=e.sentence,
                translation=e.translation,
                difficulty_level=e.difficulty_level,
                context_type=e.context_type,
                extra_data=parse_extra_data(e.extra_data),
            ) for e in examples
        ],
        false_friends=[
            FalseFriend(
                id=f.id,
                target_language=f.target_language,
                similar_word=f.similar_word,
                similar_word_meaning=f.similar_word_meaning,
                confusion_level=f.confusion_level,
                extra_data=parse_extra_data(f.extra_data),
            ) for f in false_friends
        ],
        proverbs=[
            Proverb(
                id=p.id,
                expression=p.expression,
                literal_meaning=p.literal_meaning,
                figurative_meaning=p.figurative_meaning,
                expression_type=p.expression_type,
                extra_data=parse_extra_data(p.extra_data),
            ) for p in proverbs
        ],
        collocations=[
            Collocation(
                id=c.id,
                collocate_word=c.collocate_word,
                collocation_type=c.collocation_type,
                example_phrase=c.example_phrase,
                frequency=c.frequency,
                extra_data=parse_extra_data(c.extra_data),
            ) for c in collocations
        ],
        dialect_variants=[
            DialectVariant(
                id=d.id,
                region=d.region,
                dialect_name=d.dialect_name,
                variant_word=d.variant_word,
                pronunciation=d.pronunciation,
                usage_notes=d.usage_notes,
                extra_data=parse_extra_data(d.extra_data),
            ) for d in dialect_variants
        ],
    )


@router.get("/dialects")
async def get_dialect_words(
    session: SessionDependency,
    language: Optional[str] = Query("de", description="Filter by language"),
):
    """
    Get all words that have dialect variants.
    Returns words with their regional dialect variants for the DialectMap feature.
    """
    flashcards_with_dialects = session.exec(
        select(FlashcardEntity)
        .where(FlashcardEntity.language == language)
        .join(DialectVariantEntity, DialectVariantEntity.flashcard_id == FlashcardEntity.id)
        .distinct()
    ).all()
    
    result = []
    for card in flashcards_with_dialects:
        dialect_variants = session.exec(
            select(DialectVariantEntity).where(DialectVariantEntity.flashcard_id == card.id)
        ).all()
        
        result.append({
            "standardGerman": card.word,
            "translation": card.translation,
            "variants": [
                {
                    "region": d.region,
                    "regionId": d.region.lower().replace(" ", "_").replace("/", "_"),
                    "dialect": d.dialect_name or d.region,
                    "variant": d.variant_word,
                    "pronunciation": d.pronunciation,
                }
                for d in dialect_variants
            ]
        })
    
    return result
