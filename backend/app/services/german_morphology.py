import re
from typing import Optional


def get_article_for_gender(gender: Optional[str], case: str = "nominative") -> str:
    """Get the German article based on gender and case."""
    articles = {
        "nominative": {"masculine": "Der", "feminine": "Die", "neuter": "Das"},
        "accusative": {"masculine": "den", "feminine": "die", "neuter": "das"},
        "dative": {"masculine": "dem", "feminine": "der", "neuter": "dem"},
    }
    if not gender or gender not in ["masculine", "feminine", "neuter"]:
        return ""
    return articles.get(case, articles["nominative"]).get(gender, "")


def get_plural_article(case: str = "nominative") -> str:
    """Get the German definite article for plural nouns."""
    if case == "dative":
        return "den"
    return "die"


def format_noun_phrase(article: str, noun: str, capitalize: bool = False) -> str:
    phrase = f"{article} {noun}".strip() if article else noun
    if capitalize and phrase:
        return phrase[0].upper() + phrase[1:]
    return phrase


def format_plural_noun_for_case(noun: str, case: str) -> str:
    if case == "dative" and not noun.endswith(("n", "s")):
        return f"{noun}n"
    return noun


def node_id_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", value).strip("_").lower()
