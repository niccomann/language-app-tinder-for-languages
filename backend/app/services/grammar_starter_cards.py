from typing import Optional

from app.database.models import FlashcardEntity


NOUN_CATEGORY_HINTS = {
    "animals",
    "family",
    "food",
    "nature",
    "objects",
}


GRAMMAR_STARTER_CARDS = [
    *[
        {"word": word, "translation": translation, "part_of_speech": "pronoun", "category": "grammar"}
        for word, translation in [
            ("ich", "I"),
            ("du", "you"),
            ("er", "he"),
            ("sie", "she/they"),
            ("es", "it"),
            ("wir", "we"),
            ("ihr", "you plural"),
            ("Sie", "you formal"),
            ("man", "one"),
            ("mich", "me"),
            ("dich", "you"),
            ("uns", "us"),
            ("euch", "you plural"),
            ("ihm", "him"),
            ("ihnen", "them"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "article", "category": "grammar"}
        for word, translation in [
            ("der", "the"),
            ("die", "the"),
            ("das", "the"),
            ("den", "the"),
            ("dem", "the"),
            ("des", "the"),
            ("ein", "a"),
            ("eine", "a"),
            ("einen", "a"),
            ("einem", "a"),
            ("einer", "a"),
            ("kein", "no"),
            ("keine", "no"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "preposition", "category": "grammar"}
        for word, translation in [
            ("in", "in"),
            ("auf", "on"),
            ("mit", "with"),
            ("zu", "to"),
            ("von", "from"),
            ("aus", "out of"),
            ("bei", "at"),
            ("nach", "after/to"),
            ("vor", "before/in front of"),
            ("unter", "under"),
            ("neben", "next to"),
            ("zwischen", "between"),
            ("durch", "through"),
            ("gegen", "against"),
            ("ohne", "without"),
            ("um", "around"),
            ("an", "at/on"),
            ("seit", "since"),
            ("bis", "until"),
            ("trotz", "despite"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "conjunction", "category": "grammar"}
        for word, translation in [
            ("und", "and"),
            ("oder", "or"),
            ("aber", "but"),
            ("weil", "because"),
            ("dass", "that"),
            ("wenn", "if/when"),
            ("obwohl", "although"),
            ("denn", "because"),
            ("sondern", "but rather"),
            ("bevor", "before"),
            ("nachdem", "after"),
            ("waehrend", "while"),
            ("als", "when"),
            ("bis", "until"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "adverb", "category": "grammar"}
        for word, translation in [
            ("heute", "today"),
            ("leider", "unfortunately"),
            ("schnell", "quickly"),
            ("langsam", "slowly"),
            ("gern", "gladly"),
            ("immer", "always"),
            ("oft", "often"),
            ("nie", "never"),
            ("morgen", "tomorrow"),
            ("gestern", "yesterday"),
            ("hier", "here"),
            ("dort", "there"),
            ("sehr", "very"),
            ("schon", "already"),
            ("noch", "still"),
            ("vielleicht", "maybe"),
            ("zusammen", "together"),
            ("allein", "alone"),
            ("bald", "soon"),
            ("jetzt", "now"),
            ("wirklich", "really"),
            ("besonders", "especially"),
            ("sofort", "immediately"),
            ("wieder", "again"),
            ("manchmal", "sometimes"),
            ("kaum", "hardly"),
            ("fast", "almost"),
            ("oben", "above"),
            ("unten", "below"),
            ("links", "left"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "adjective", "category": "grammar"}
        for word, translation in [
            ("gut", "good"),
            ("schlecht", "bad"),
            ("gross", "big"),
            ("klein", "small"),
            ("neu", "new"),
            ("alt", "old"),
            ("leicht", "easy"),
            ("schwer", "difficult"),
            ("ruhig", "calm"),
            ("stark", "strong"),
            ("warm", "warm"),
            ("kalt", "cold"),
            ("richtig", "correct"),
            ("falsch", "wrong"),
            ("wichtig", "important"),
            ("einfach", "simple"),
            ("kurz", "short"),
            ("lang", "long"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "verb", "category": "verbs"}
        for word, translation in [
            ("sein", "to be"),
            ("haben", "to have"),
            ("werden", "to become"),
            ("gehen", "to go"),
            ("kommen", "to come"),
            ("sehen", "to see"),
            ("sprechen", "to speak"),
            ("lesen", "to read"),
            ("essen", "to eat"),
            ("trinken", "to drink"),
            ("lernen", "to learn"),
            ("schlafen", "to sleep"),
        ]
    ],
    *[
        {"word": word, "translation": translation, "part_of_speech": "noun", "category": "grammar", "gender": gender, "plural_form": plural}
        for word, translation, gender, plural in [
            ("Garten", "garden", "masculine", "Gaerten"),
            ("Zeit", "time", "feminine", "Zeiten"),
            ("Freund", "friend", "masculine", "Freunde"),
            ("Buch", "book", "neuter", "Buecher"),
        ]
    ],
]


def card_part_of_speech(card: FlashcardEntity) -> Optional[str]:
    if card.part_of_speech:
        return card.part_of_speech.lower()

    category = (card.category or "").lower()
    if category in {"verbs", "actions"}:
        return "verb"
    if category == "colors":
        return "adjective"
    if category in NOUN_CATEGORY_HINTS:
        return "noun"
    return None


def build_grammar_starter_cards(
    flashcards: list[FlashcardEntity],
    language: str,
) -> list[FlashcardEntity]:
    existing = {
        ((card.word or "").casefold(), card_part_of_speech(card))
        for card in flashcards
    }
    starter_cards: list[FlashcardEntity] = []

    for index, starter in enumerate(GRAMMAR_STARTER_CARDS, start=1):
        key = (starter["word"].casefold(), starter["part_of_speech"])
        if key in existing:
            continue

        starter_cards.append(
            FlashcardEntity(
                id=-index,
                word=starter["word"],
                translation=starter["translation"],
                image_url="",
                language=language,
                difficulty="easy",
                category=starter["category"],
                cefr_level="A1",
                frequency_band="very_common",
                part_of_speech=starter["part_of_speech"],
                gender=starter.get("gender"),
                plural_form=starter.get("plural_form"),
            )
        )

    return starter_cards
