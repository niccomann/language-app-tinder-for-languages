import json
from typing import Any, Optional

from app.database.models import FlashcardEntity, UserProgressEntity
from app.models import (
    Collocation,
    DialectVariant,
    Etymology,
    ExampleSentence,
    FalseFriend,
    FlashcardDetail,
    FlashcardWithProgress,
    Proverb,
)


MEDIA_COLUMNS = {"image_base64", "audio_base64"}


def parse_extra_data(extra_data_str: Optional[str]) -> Optional[dict]:
    if not extra_data_str:
        return None
    try:
        return json.loads(extra_data_str)
    except (json.JSONDecodeError, TypeError):
        return None


def entity_to_enriched_data(card: FlashcardEntity) -> dict[str, Any]:
    return {
        "id": card.id,
        "word": card.word,
        "translation": card.translation,
        "image_url": card.image_url,
        "image_base64": card.image_base64,
        "language": card.language,
        "difficulty": card.difficulty,
        "category": card.category,
        "created_at": card.created_at,
        "updated_at": card.updated_at,
        "cefr_level": card.cefr_level,
        "frequency_band": card.frequency_band,
        "register": card.language_register,
        "thematic_domain": card.thematic_domain,
        "part_of_speech": card.part_of_speech,
        "gender": card.gender,
        "plural_form": card.plural_form,
        "is_compound": card.is_compound,
        "word_formation": card.word_formation,
        "image_coherence_score": card.image_coherence_score,
        "pronunciation_ipa": card.pronunciation_ipa,
        "example_sentence": card.example_sentence,
        "etymology_text": card.etymology_text,
        "visual_mnemonic": card.visual_mnemonic,
        "memory_hook": card.memory_hook,
        "extra_data": parse_extra_data(card.extra_data),
    }


def build_flashcard_with_progress(
    card: FlashcardEntity,
    progress: Optional[UserProgressEntity],
) -> FlashcardWithProgress:
    return FlashcardWithProgress(
        **entity_to_enriched_data(card),
        known=progress.known if progress else None,
        review_count=progress.review_count if progress else None,
        swipe_right_count=progress.swipe_right_count if progress else None,
        swipe_left_count=progress.swipe_left_count if progress else None,
        last_reviewed=progress.last_reviewed if progress else None,
    )


def build_flashcard_detail(card: FlashcardEntity, related: dict[str, list[dict]]) -> FlashcardDetail:
    return FlashcardDetail(
        **entity_to_enriched_data(card),
        etymologies=[
            Etymology(
                id=e.get("id"),
                origin_language=e.get("origin_language"),
                origin_word=e.get("origin_word"),
                etymology_text=e.get("etymology_text"),
                language_family=e.get("language_family"),
                time_period=e.get("time_period"),
            )
            for e in related["etymologies"]
        ],
        examples=[
            ExampleSentence(
                id=e.get("id"),
                sentence=e.get("sentence"),
                translation=e.get("translation"),
                difficulty_level=e.get("difficulty_level"),
                context_type=e.get("context_type"),
            )
            for e in related["examples"]
        ],
        false_friends=[
            FalseFriend(
                id=f.get("id"),
                target_language=f.get("target_language"),
                similar_word=f.get("similar_word"),
                similar_word_meaning=f.get("similar_word_meaning"),
                confusion_level=f.get("confusion_level"),
            )
            for f in related["false_friends"]
        ],
        proverbs=[
            Proverb(
                id=p.get("id"),
                expression=p.get("expression"),
                literal_meaning=p.get("literal_meaning"),
                figurative_meaning=p.get("figurative_meaning"),
                expression_type=p.get("expression_type"),
            )
            for p in related["proverbs"]
        ],
        collocations=[
            Collocation(
                id=c.get("id"),
                collocate_word=c.get("collocate_word"),
                collocation_type=c.get("collocation_type"),
                example_phrase=c.get("example_phrase"),
                frequency=c.get("frequency"),
            )
            for c in related["collocations"]
        ],
        dialect_variants=[
            DialectVariant(
                id=d.get("id"),
                region=d.get("region"),
                dialect_name=d.get("dialect_name"),
                variant_word=d.get("variant_word"),
                pronunciation=d.get("pronunciation"),
                usage_notes=d.get("usage_notes"),
            )
            for d in related["dialect_variants"]
        ],
    )


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


def build_word_db_row(
    card: FlashcardEntity,
    producer_word: dict,
    related: dict[str, list[dict]],
) -> dict:
    return {
        "flashcard": {
            "id": card.id,
            "word": card.word,
            "language": card.language,
            "translation": card.translation,
        },
        "word": remove_media_columns(producer_word),
        "media": media_summary(producer_word),
        "related": related,
    }


def count_by_attribute(cards: list[FlashcardEntity], attribute_name: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for card in cards:
        value = getattr(card, attribute_name)
        if value:
            counts[value] = counts.get(value, 0) + 1
    return counts


def group_dialect_words(rows: list[dict]) -> list[dict]:
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
