from dataclasses import dataclass


TOTAL_PATH_LEVELS = 400


@dataclass(frozen=True)
class CefrPathPhase:
    code: str
    start_level: int
    end_level: int

    @property
    def label(self) -> str:
        return f"{self.code} · Levels {self.start_level}-{self.end_level}"


@dataclass(frozen=True)
class PathMissionDefinition:
    mission_id: str
    level: int
    title: str
    detail: str
    objective: str
    action: str
    route: str
    cefr_phase: str
    phase_label: str
    phase_start_level: int
    phase_end_level: int
    target_value: int
    is_checkpoint: bool


CEFR_PATH_PHASES = (
    CefrPathPhase("A1", 1, 100),
    CefrPathPhase("A2", 101, 200),
    CefrPathPhase("B1", 201, 300),
    CefrPathPhase("B2", 301, 400),
)

CHECKPOINT_TITLES = {
    1: ("Placement", "First signal from known and missed words."),
    25: ("Core Words", "Build a stable base for everyday vocabulary."),
    50: ("Phrase Ready", "Strong words can start mixing into sentences."),
    100: ("A1 Gate", "Close the first language phase with everyday recall."),
    200: ("A2 Gate", "Move from controlled phrases into wider contexts."),
    300: ("B1 Gate", "Use longer contexts with less scaffolding."),
    400: ("B2 Mastery Review", "Keep advanced recall active over time."),
}

MISSION_CYCLE = (
    ("Vocabulary Quest", "Practice the next vocabulary pack.", "review_words", "/learn"),
    ("Sound & Recall", "Recognize words through sound and memory.", "listen", "/sentence-practice"),
    ("Sentence Move", "Place words in the right order.", "sentence_placement", "/placement/sentence"),
    ("Word Match", "Match target words with their meaning.", "word_match", "/word-match"),
    ("Grammar Gate", "Check how the sentence pieces connect.", "grammar_lab", "/grammar/graph"),
    ("Review Sprint", "Stabilize weak words before moving forward.", "review", "/review"),
)


def mission_id_for_level(language: str, level: int) -> str:
    return f"{language}-path-level-{level:03d}"


def phase_for_level(level: int) -> CefrPathPhase:
    bounded_level = min(TOTAL_PATH_LEVELS, max(1, level))
    for phase in CEFR_PATH_PHASES:
        if phase.start_level <= bounded_level <= phase.end_level:
            return phase
    return CEFR_PATH_PHASES[-1]


def _mission_copy_for_level(level: int) -> tuple[str, str, str, str]:
    checkpoint = CHECKPOINT_TITLES.get(level)
    if checkpoint:
        return checkpoint[0], checkpoint[1], "checkpoint", "/learn"

    base_title, detail, action, route = MISSION_CYCLE[(level - 1) % len(MISSION_CYCLE)]
    return f"{base_title} {level}", detail, action, route


def build_path_mission_definitions(language: str = "de") -> list[PathMissionDefinition]:
    definitions: list[PathMissionDefinition] = []
    for level in range(1, TOTAL_PATH_LEVELS + 1):
        phase = phase_for_level(level)
        title, detail, action, route = _mission_copy_for_level(level)
        is_checkpoint = level in CHECKPOINT_TITLES or level % 25 == 0
        definitions.append(
            PathMissionDefinition(
                mission_id=mission_id_for_level(language, level),
                level=level,
                title=title,
                detail=detail,
                objective=f"Complete level {level} to unlock level {min(TOTAL_PATH_LEVELS, level + 1)}.",
                action=action,
                route=route,
                cefr_phase=phase.code,
                phase_label=phase.label,
                phase_start_level=phase.start_level,
                phase_end_level=phase.end_level,
                target_value=1,
                is_checkpoint=is_checkpoint,
            )
        )
    return definitions

