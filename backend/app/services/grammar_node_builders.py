from typing import Any, Optional

from app.database.models import FlashcardEntity
from app.models import LearningPreferenceProfile
from app.services.german_morphology import (
    format_noun_phrase,
    format_plural_noun_for_case,
    get_article_for_gender,
    get_plural_article,
    node_id_part,
)
from app.services.grammar_schemas import GrammarNode, GrammarNodeMeta
from app.services.grammar_starter_cards import card_part_of_speech
from app.services.preference_filter import card_preference_score, has_active_profile


def common_node_fields(card: FlashcardEntity, source_word_id: Optional[int] = None) -> dict[str, Any]:
    return {
        "lemma": card.word,
        "part_of_speech": card_part_of_speech(card),
        "translation": card.translation,
        "source_word_id": source_word_id,
        "image_base64": card.image_base64,
        "cefr_level": card.cefr_level,
        "frequency_band": card.frequency_band,
        "register": card.language_register,
        "thematic_domain": card.thematic_domain,
        "difficulty": card.difficulty,
        "category": card.category,
    }


def grammar_card_sort_key(
    card: FlashcardEntity,
    priority_words: dict[str, int],
    preference_profile: Optional[LearningPreferenceProfile] = None,
) -> tuple[int, int, int]:
    card_id = card.id or 0
    stable_id = card_id if card_id > 0 else abs(card_id)
    preference_score = (
        card_preference_score(card, preference_profile)
        if preference_profile and has_active_profile(preference_profile)
        else 0
    )
    return (-preference_score, priority_words.get(card.word, 10_000), stable_id)


def add_noun_nodes(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
) -> None:
    common_fields = common_node_fields(card, source_word_id)
    singular_forms = [
        ("subject", "nominative", "singular", get_article_for_gender(card.gender, "nominative"), True),
        ("object", "accusative", "singular", get_article_for_gender(card.gender, "accusative"), False),
        ("indirect_object", "dative", "singular", get_article_for_gender(card.gender, "dative"), False),
    ]

    for node_type, case, number, article, capitalize in singular_forms:
        label = format_noun_phrase(article, card.word, capitalize)
        available_nodes.append(GrammarNode(
            id=f"{node_type}_{card.id}_{case}_singular",
            label=label,
            type=node_type,
            surface_form=label,
            meta=GrammarNodeMeta(case=case, gender=card.gender, number=number),
            **common_fields,
        ))

    if card.plural_form and card.plural_form != card.word:
        plural_forms = [
            ("subject", "nominative", get_plural_article("nominative"), True),
            ("object", "accusative", get_plural_article("accusative"), False),
            ("indirect_object", "dative", get_plural_article("dative"), False),
        ]
        for node_type, case, article, capitalize in plural_forms:
            noun_form = format_plural_noun_for_case(card.plural_form, case)
            label = format_noun_phrase(article, noun_form, capitalize)
            available_nodes.append(GrammarNode(
                id=f"{node_type}_{card.id}_{case}_plural",
                label=label,
                type=node_type,
                surface_form=label,
                meta=GrammarNodeMeta(case=case, gender=card.gender, number="plural"),
                **common_fields,
            ))


def add_verb_nodes(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
    conjugations: list[dict[str, Any]],
) -> None:
    common_fields = common_node_fields(card, source_word_id)
    if not conjugations:
        available_nodes.append(GrammarNode(
            id=f"verb_{card.id}_infinitive",
            label=card.word,
            type="predicate",
            surface_form=card.word,
            meta=GrammarNodeMeta(tense="infinitive"),
            **common_fields,
        ))
        return

    for conjugation in conjugations:
        form = conjugation["form"]
        pronoun = conjugation["pronoun"]
        available_nodes.append(GrammarNode(
            id=f"verb_{card.id}_{node_id_part(pronoun)}",
            label=form,
            type="predicate",
            surface_form=form,
            meta=GrammarNodeMeta(
                tense=conjugation["tense"],
                mood=conjugation["mood"],
                person=conjugation["person"],
                number=conjugation["number"],
                pronoun=pronoun,
            ),
            **common_fields,
        ))


def add_simple_word_node(
    available_nodes: list[GrammarNode],
    card: FlashcardEntity,
    source_word_id: Optional[int],
    node_type: str,
) -> None:
    label = card.word.capitalize() if node_type == "pronoun" and card.word == "ich" else card.word
    available_nodes.append(GrammarNode(
        id=f"{node_type}_{card.id}",
        label=label,
        type=node_type,
        surface_form=label,
        meta=GrammarNodeMeta(),
        **common_node_fields(card, source_word_id),
    ))
