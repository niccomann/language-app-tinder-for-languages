from typing import Any


COMMON_PRESENT_CONJUGATIONS = {
    "sein": ["bin", "bist", "ist", "sind", "seid", "sind"],
    "haben": ["habe", "hast", "hat", "haben", "habt", "haben"],
    "werden": ["werde", "wirst", "wird", "werden", "werdet", "werden"],
    "gehen": ["gehe", "gehst", "geht", "gehen", "geht", "gehen"],
    "kommen": ["komme", "kommst", "kommt", "kommen", "kommt", "kommen"],
    "sehen": ["sehe", "siehst", "sieht", "sehen", "seht", "sehen"],
    "sprechen": ["spreche", "sprichst", "spricht", "sprechen", "sprecht", "sprechen"],
    "lesen": ["lese", "liest", "liest", "lesen", "lest", "lesen"],
    "essen": ["esse", "isst", "isst", "essen", "esst", "essen"],
    "trinken": ["trinke", "trinkst", "trinkt", "trinken", "trinkt", "trinken"],
    "lernen": ["lerne", "lernst", "lernt", "lernen", "lernt", "lernen"],
    "schlafen": ["schlafe", "schlaefst", "schlaeft", "schlafen", "schlaft", "schlafen"],
    "schreiben": ["schreibe", "schreibst", "schreibt", "schreiben", "schreibt", "schreiben"],
}


PRESENT_CONJUGATION_PRONOUNS = [
    ("ich", 1, "singular"),
    ("du", 2, "singular"),
    ("er/sie/es", 3, "singular"),
    ("wir", 1, "plural"),
    ("ihr", 2, "plural"),
    ("sie/Sie", 3, "plural"),
]


def build_present_conjugation_rows(lemma: str) -> list[dict[str, Any]]:
    forms = COMMON_PRESENT_CONJUGATIONS.get(lemma.casefold())
    if not forms:
        return []

    return [
        {
            "mood": "indicative",
            "tense": "present",
            "person": person,
            "number": number,
            "pronoun": pronoun,
            "form": form,
        }
        for form, (pronoun, person, number) in zip(forms, PRESENT_CONJUGATION_PRONOUNS)
    ]
