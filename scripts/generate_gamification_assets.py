#!/usr/bin/env python3
"""Generate the small UI mascot frame set used by the learning app."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import logging
import os
import shutil
from dataclasses import asdict, dataclass
from pathlib import Path
from statistics import median

from dotenv import load_dotenv
from openai import OpenAI


REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "frontend" / "src" / "assets" / "gamification"
CACHE_DIR = REPO_ROOT / "asset_cache" / "gamification"
HASH_DIR = CACHE_DIR / "by_hash"
INDEX_PATH = CACHE_DIR / "index.json"

DEFAULT_MODEL = os.environ.get("OPENAI_IMAGE_MODEL", "gpt-image-2")
DEFAULT_SIZE = os.environ.get("GAMIFICATION_IMAGE_SIZE", "1024x1024")
DEFAULT_QUALITY = os.environ.get("GAMIFICATION_IMAGE_QUALITY", "medium")
OUTPUT_SIZE_PX = int(os.environ.get("GAMIFICATION_OUTPUT_SIZE_PX", "512"))

SOFT_3D_GAMING_STYLE = (
    "soft 3D gaming sticker, polished mobile language-learning game asset, "
    "rounded toy-like shapes, clean silhouette, expressive but simple face, "
    "bright balanced teal, lime, coral, and warm yellow accents, "
    "consistent camera, consistent proportions, single centered character, "
    "generous padding, family-friendly, no text, no letters, no watermark, "
    "no UI frame, no photorealism"
)

FEATURE_GUIDE_STYLE = (
    "feature explanation asset for a non-technical language learner, "
    "communicates the app behavior visually with simple props, no technical "
    "screens, no code, no charts with labels, no readable text"
)

TRANSPARENT_BACKGROUND_UNSUPPORTED_MODELS = {"gpt-image-2"}
KEY_COLOR = "#00ff00"
TRANSPARENT_THRESHOLD = 18.0
OPAQUE_THRESHOLD = 150.0


@dataclass(frozen=True)
class MascotCharacterSpec:
    slug: str
    label: str
    identity_prompt: str
    reference_identity_prompt: str


@dataclass(frozen=True)
class MascotAssetFrame:
    key: str
    state: str
    prompt: str
    character: str = "coach"
    use_reference: bool = True


CHARACTERS = {
    "coach": MascotCharacterSpec(
        slug="coach",
        label="Language coach",
        identity_prompt=(
            "A friendly rounded learning coach mascot with glasses, a small bow tie, "
            "soft teal and coral clothing accents, and a confident teacher posture."
        ),
        reference_identity_prompt=(
            "Use the provided coach mascot as the exact reference identity: same "
            "character, same colors, same glasses, same bow tie, same proportions, "
            "same camera."
        ),
    ),
    "explorer": MascotCharacterSpec(
        slug="explorer",
        label="Language explorer",
        identity_prompt=(
            "A cheerful rounded language explorer mascot with a teal jacket, coral "
            "scarf, small blank backpack, chunky boots, and curious confident posture."
        ),
        reference_identity_prompt=(
            "Use the provided explorer mascot as the exact reference identity: same "
            "teal jacket, same coral scarf, same backpack, same rounded boots, same "
            "proportions, same camera."
        ),
    ),
    "robot": MascotCharacterSpec(
        slug="robot",
        label="Robot tutor",
        identity_prompt=(
            "A small rounded robot tutor mascot with a friendly face screen, teal "
            "body, coral side panels, warm yellow antenna, stubby arms, and no marks "
            "or letters on the screen."
        ),
        reference_identity_prompt=(
            "Use the provided robot tutor mascot as the exact reference identity: "
            "same face screen, same teal body, same coral panels, same yellow antenna, "
            "same proportions, same camera."
        ),
    ),
}


ASSET_FRAMES = [
    MascotAssetFrame(
        key="mascot_idle_a",
        state="idle",
        prompt=(
            "A friendly rounded learning coach mascot standing upright, relaxed "
            "pose, one small flashcard-shaped prop held at the side with no marks "
            "on it, curious confident expression."
        ),
        use_reference=False,
    ),
    MascotAssetFrame(
        key="mascot_idle_b",
        state="idle",
        prompt=(
            "The same friendly rounded learning coach mascot in the same outfit "
            "and colors, tiny bounce pose, one foot slightly lifted, relaxed arms, "
            "curious confident expression."
        ),
    ),
    MascotAssetFrame(
        key="mascot_correct_a",
        state="correct",
        prompt=(
            "The same friendly rounded learning coach mascot celebrating a correct "
            "answer, arms lifted, a few simple star and confetti shapes around it, "
            "happy expression."
        ),
    ),
    MascotAssetFrame(
        key="mascot_correct_b",
        state="correct",
        prompt=(
            "The same friendly rounded learning coach mascot in a second celebration "
            "frame, leaning forward with a positive gesture, small star shapes, "
            "happy expression, same colors and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_wrong_a",
        state="wrong",
        prompt=(
            "The same friendly rounded learning coach mascot giving gentle retry "
            "feedback, thoughtful pose with one hand near the chin, supportive "
            "expression, no sadness, no alarm."
        ),
    ),
    MascotAssetFrame(
        key="mascot_wrong_b",
        state="wrong",
        prompt=(
            "The same friendly rounded learning coach mascot in a second retry "
            "frame, slightly tilted pose, supportive expression, one small blank "
            "flashcard-shaped prop nearby with no marks on it."
        ),
    ),
    MascotAssetFrame(
        key="mascot_level_up_a",
        state="levelUp",
        prompt=(
            "The same friendly rounded learning coach mascot celebrating progress, "
            "standing on a small glowing platform, simple starburst shapes, proud "
            "expression, same colors and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_level_up_b",
        state="levelUp",
        prompt=(
            "The same friendly rounded learning coach mascot in a second progress "
            "celebration frame, small upward jump, simple starburst shapes, proud "
            "expression, same colors and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_idle_a",
        state="idle",
        character='explorer',
        use_reference=False,
        prompt=(
            "The language explorer mascot standing upright, relaxed pose, one hand "
            "near a small blank map-shaped prop with no marks on it, curious confident "
            "expression."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_idle_b",
        state="idle",
        character='explorer',
        prompt=(
            "The same language explorer mascot in a tiny bounce pose, backpack visible, "
            "one foot slightly lifted, relaxed arms, curious confident expression."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_correct_a",
        state="correct",
        character='explorer',
        prompt=(
            "The same language explorer mascot celebrating a correct answer, arms lifted, "
            "small star and confetti shapes around it, happy expression."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_correct_b",
        state="correct",
        character='explorer',
        prompt=(
            "The same language explorer mascot in a second celebration frame, leaning "
            "forward with a positive gesture, small star shapes, happy expression, same "
            "colors and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_wrong_a",
        state="wrong",
        character='explorer',
        prompt=(
            "The same language explorer mascot giving gentle retry feedback, thoughtful "
            "pose with one hand near the chin, supportive expression, no sadness, no alarm."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_wrong_b",
        state="wrong",
        character='explorer',
        prompt=(
            "The same language explorer mascot in a second retry frame, slightly tilted "
            "pose, supportive expression, one small blank map-shaped prop nearby with no "
            "marks on it."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_level_up_a",
        state="levelUp",
        character='explorer',
        prompt=(
            "The same language explorer mascot celebrating progress, standing on a small "
            "glowing platform, simple starburst shapes, proud expression, same colors and "
            "proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_explorer_level_up_b",
        state="levelUp",
        character='explorer',
        prompt=(
            "The same language explorer mascot in a second progress celebration frame, "
            "small upward jump, simple starburst shapes, proud expression, same colors and "
            "proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_idle_a",
        state="idle",
        character='robot',
        use_reference=False,
        prompt=(
            "The robot tutor mascot standing upright, relaxed pose, one stubby arm raised "
            "slightly, friendly screen-face expression, no symbols or letters on the screen."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_idle_b",
        state="idle",
        character='robot',
        prompt=(
            "The same robot tutor mascot in a tiny bounce pose, antenna tilted slightly, "
            "one foot lifted, friendly screen-face expression, no symbols or letters."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_correct_a",
        state="correct",
        character='robot',
        prompt=(
            "The same robot tutor mascot celebrating a correct answer, arms lifted, small "
            "star and confetti shapes around it, happy screen-face expression, no symbols "
            "or letters."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_correct_b",
        state="correct",
        character='robot',
        prompt=(
            "The same robot tutor mascot in a second celebration frame, leaning forward "
            "with a positive gesture, small star shapes, happy screen-face expression, same "
            "colors and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_wrong_a",
        state="wrong",
        character='robot',
        prompt=(
            "The same robot tutor mascot giving gentle retry feedback, thoughtful tilted "
            "pose, one hand near the face screen, supportive expression, no sadness, no alarm, "
            "no symbols or letters."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_wrong_b",
        state="wrong",
        character='robot',
        prompt=(
            "The same robot tutor mascot in a second retry frame, slightly tilted pose, "
            "supportive screen-face expression, one small blank flashcard-shaped prop nearby "
            "with no marks on it."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_level_up_a",
        state="levelUp",
        character='robot',
        prompt=(
            "The same robot tutor mascot celebrating progress, standing on a small glowing "
            "platform, simple starburst shapes, proud screen-face expression, same colors "
            "and proportions."
        ),
    ),
    MascotAssetFrame(
        key="mascot_robot_level_up_b",
        state="levelUp",
        character='robot',
        prompt=(
            "The same robot tutor mascot in a second progress celebration frame, small upward "
            "jump, simple starburst shapes, proud screen-face expression, same colors and "
            "proportions."
        ),
    ),
]

GUIDE_ASSET_FRAMES = [
    MascotAssetFrame(
        key="guide_vocabulary_scan_a",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot sorting two blank "
            "flashcard piles, one pile glowing with warm confidence and one pile "
            "marked by a soft review sparkle, clear swipe-decision gesture."
        ),
    ),
    MascotAssetFrame(
        key="guide_vocabulary_scan_b",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot in a second frame, "
            "moving one blank flashcard from the center toward a glowing pile, "
            "supportive expression, same proportions."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_path_a",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot pointing at a winding trail of "
            "round stepping stones rising upward, a few small stars around the "
            "next step, no symbols or labels."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_path_b",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot in a second frame, stepping onto "
            "the next round stone on the learning trail, backpack visible, proud "
            "but gentle expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_filters_a",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot choosing between "
            "colorful blank category tokens floating nearby, one hand selecting "
            "a token, calm focused expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_filters_b",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot in a second frame, "
            "three selected blank category tokens forming a neat training set, "
            "simple check sparkle without any symbol."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_system_a",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot holding a glowing rounded knowledge "
            "meter made of dots and bars, no numbers, one small brain-like spark "
            "shape, friendly screen-face expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_learning_system_b",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot in a second frame, knowledge dots gently "
            "rearranging into a smoother path, warm confident screen-face, no "
            "symbols or letters."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_placement_a",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot arranging blank word "
            "tiles into an empty sentence rail, one correct tile glowing softly, "
            "focused encouraging expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_placement_b",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot in a second frame, "
            "placing the final blank word tile into the sentence rail, small star "
            "shapes, no marks on the tiles."
        ),
    ),
    MascotAssetFrame(
        key="guide_library_a",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot opening a chunky blank book with "
            "floating blank cards around it, organized archive feeling, no text "
            "on any surface."
        ),
    ),
    MascotAssetFrame(
        key="guide_library_b",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot in a second frame, gently pulling "
            "one blank card from the open book archive, curious confident pose."
        ),
    ),
    MascotAssetFrame(
        key="guide_grammar_graph_a",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot connecting glowing round nodes with soft "
            "lines, like a language relationship map, no labels, no letters, no "
            "numbers."
        ),
    ),
    MascotAssetFrame(
        key="guide_grammar_graph_b",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot in a second frame, one new glowing node "
            "joining the relationship map, friendly screen-face, same colors."
        ),
    ),
    MascotAssetFrame(
        key="guide_word_cloud_a",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot holding floating rounded word "
            "bubbles that have no readable text, some bubbles larger than others, "
            "curious expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_word_cloud_b",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot in a second frame, gently tapping "
            "the largest blank bubble as smaller bubbles drift nearby, no symbols."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_graph_builder_a",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot building a sentence as connected blank "
            "node tiles, a small arrow-like flow made only of shapes, no text."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_graph_builder_b",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot in a second frame, snapping two blank "
            "sentence nodes together with a soft glow, same proportions and palette."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_composer_a",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot composing a sentence "
            "from several blank rounded tiles on a clean rail, one tile lifted in "
            "mid-placement."
        ),
    ),
    MascotAssetFrame(
        key="guide_sentence_composer_b",
        state="guide",
        prompt=(
            "The same friendly rounded learning coach mascot in a second frame, "
            "finished blank sentence rail glowing softly, happy focused expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_clusters_a",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot grouping colorful blank tokens into "
            "three tidy clusters, each cluster a different accent color, no labels."
        ),
    ),
    MascotAssetFrame(
        key="guide_clusters_b",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot in a second frame, moving one blank "
            "token into its matching cluster, clear sorting motion."
        ),
    ),
    MascotAssetFrame(
        key="guide_dialects_a",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot holding a blank stylized map made "
            "of colored regions, a small compass-like shape, no place names."
        ),
    ),
    MascotAssetFrame(
        key="guide_dialects_b",
        state="guide",
        character="explorer",
        prompt=(
            "The same language explorer mascot in a second frame, pointing to one "
            "colored region on the blank map, curious confident expression."
        ),
    ),
    MascotAssetFrame(
        key="guide_hierarchy_a",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot arranging layered round nodes like a tree "
            "of language levels, larger root node below smaller connected nodes, "
            "no labels."
        ),
    ),
    MascotAssetFrame(
        key="guide_hierarchy_b",
        state="guide",
        character="robot",
        prompt=(
            "The same robot tutor mascot in a second frame, a new small node rising "
            "into the layered language tree, warm screen-face expression."
        ),
    ),
]

ALL_ASSET_FRAMES = ASSET_FRAMES + GUIDE_ASSET_FRAMES


def compose_prompt(frame: MascotAssetFrame, *, reference_mode: bool = False) -> str:
    character = CHARACTERS[frame.character]
    identity = character.reference_identity_prompt if reference_mode else character.identity_prompt
    guide_context = f"{FEATURE_GUIDE_STYLE}. " if frame.state == "guide" else ""
    return (
        f"{SOFT_3D_GAMING_STYLE}. "
        f"{guide_context}"
        f"Character: {character.label}. {identity} "
        f"Use a flat solid {KEY_COLOR} chroma-key background so the app can remove it "
        "or visually crop it cleanly if needed. The background must be perfectly "
        "uniform with no floor, no shadows, no gradients, and no texture. "
        f"Asset state: {frame.state}. Frame request: {frame.prompt}"
    )


def _file_sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def _smoothstep(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def _channel_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return max(abs(a[0] - b[0]), abs(a[1] - b[1]), abs(a[2] - b[2]))


def _sample_border_key(image) -> tuple[int, int, int]:
    width, height = image.size
    pixels = image.load()
    samples: list[tuple[int, int, int]] = []
    band = max(1, min(width, height, 6))
    step = max(1, min(width, height) // 256)
    for x in range(0, width, step):
        for y in range(band):
            samples.append(pixels[x, y][:3])
            samples.append(pixels[x, height - 1 - y][:3])
    for y in range(0, height, step):
        for x in range(band):
            samples.append(pixels[x, y][:3])
            samples.append(pixels[width - 1 - x, y][:3])
    return (
        int(round(median(sample[0] for sample in samples))),
        int(round(median(sample[1] for sample in samples))),
        int(round(median(sample[2] for sample in samples))),
    )


def _key_dominance(rgb: tuple[int, int, int], key: tuple[int, int, int]) -> float:
    key_channel = max(range(3), key=lambda idx: key[idx])
    non_key = [idx for idx in range(3) if idx != key_channel]
    return float(rgb[key_channel] - max(rgb[idx] for idx in non_key))


def _cleanup_key_spill(rgb: tuple[int, int, int], key: tuple[int, int, int], alpha: int) -> tuple[int, int, int]:
    if alpha >= 252:
        return rgb
    key_channel = max(range(3), key=lambda idx: key[idx])
    channels = [float(value) for value in rgb]
    non_key = [idx for idx in range(3) if idx != key_channel]
    cap = max(channels[idx] for idx in non_key) + 4.0
    channels[key_channel] = min(channels[key_channel], cap)
    return tuple(max(0, min(255, int(round(value)))) for value in channels)  # type: ignore[return-value]


def remove_chroma_key_background(path: Path) -> None:
    """Convert the generated key-color background into alpha.

    The image provider used here does not expose native transparency for every
    configured model, so we mirror the 2D game pipeline: ask for a solid key
    background, then locally remove it before the frontend imports the asset.
    """
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError("Pillow is required for chroma-key cleanup") from exc

    with Image.open(path) as image:
        rgba = image.convert("RGBA")
    key = _sample_border_key(rgba)
    pixels = rgba.load()
    width, height = rgba.size

    for y in range(height):
        for x in range(width):
            red, green, blue, original_alpha = pixels[x, y]
            rgb = (red, green, blue)
            distance = _channel_distance(rgb, key)
            key_like = distance <= OPAQUE_THRESHOLD or _key_dominance(rgb, key) >= 16.0
            if not key_like:
                continue

            if distance <= TRANSPARENT_THRESHOLD:
                output_alpha = 0
            elif distance >= OPAQUE_THRESHOLD:
                output_alpha = 255
            else:
                ratio = (distance - TRANSPARENT_THRESHOLD) / (OPAQUE_THRESHOLD - TRANSPARENT_THRESHOLD)
                output_alpha = int(round(255.0 * _smoothstep(ratio)))
            output_alpha = int(round(output_alpha * (original_alpha / 255.0)))

            if output_alpha == 0:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            cleaned = _cleanup_key_spill(rgb, key, output_alpha)
            pixels[x, y] = (*cleaned, output_alpha)

    if max(rgba.size) > OUTPUT_SIZE_PX:
        resampling = getattr(Image, "Resampling", Image).LANCZOS
        rgba.thumbnail((OUTPUT_SIZE_PX, OUTPUT_SIZE_PX), resampling)

    rgba.save(path, "PNG", optimize=True)


class AssetCache:
    def __init__(self, cache_dir: Path = CACHE_DIR):
        self.cache_dir = cache_dir
        self.hash_dir = cache_dir / "by_hash"
        self.index_path = cache_dir / "index.json"

    def _key(self, prompt: str, transparent: bool, size: str, model: str) -> str:
        h = hashlib.sha256()
        h.update(prompt.encode("utf-8"))
        h.update(b"|")
        h.update(str(bool(transparent)).encode("ascii"))
        h.update(b"|")
        h.update(size.encode("ascii"))
        h.update(b"|")
        h.update(model.encode("ascii"))
        return h.hexdigest()[:32]

    def _load_index(self) -> dict:
        if not self.index_path.exists():
            return {"entries": {}, "stats": {"hits": 0, "writes": 0}}
        return json.loads(self.index_path.read_text())

    def _save_index(self, index: dict) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.index_path.write_text(json.dumps(index, indent=2, sort_keys=True))

    def lookup(self, prompt: str, transparent: bool, size: str, model: str, dest: Path) -> bool:
        cache_key = self._key(prompt, transparent, size, model)
        cached = self.hash_dir / f"{cache_key}.png"
        if not cached.exists():
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(cached, dest)
        index = self._load_index()
        index["stats"]["hits"] = index["stats"].get("hits", 0) + 1
        self._save_index(index)
        return True

    def store(
        self,
        prompt: str,
        transparent: bool,
        size: str,
        model: str,
        source: Path,
        *,
        frame: MascotAssetFrame,
    ) -> None:
        cache_key = self._key(prompt, transparent, size, model)
        self.hash_dir.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, self.hash_dir / f"{cache_key}.png")
        index = self._load_index()
        index["entries"][cache_key] = {
            "key": frame.key,
            "state": frame.state,
            "character": frame.character,
            "model": model,
            "size": size,
            "transparent": transparent,
            "prompt_preview": prompt[:240],
        }
        index["stats"]["writes"] = index["stats"].get("writes", 0) + 1
        self._save_index(index)


class OpenAIGamificationImageClient:
    def __init__(
        self,
        *,
        model: str = DEFAULT_MODEL,
        size: str = DEFAULT_SIZE,
        quality: str = DEFAULT_QUALITY,
        cache: AssetCache | None = None,
    ):
        load_dotenv(REPO_ROOT / ".env")
        load_dotenv(REPO_ROOT / "backend" / ".env")
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is required to generate gamification assets")
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.size = size
        self.quality = quality
        self.cache = cache or AssetCache()

    def _supports_background(self) -> bool:
        return self.model not in TRANSPARENT_BACKGROUND_UNSUPPORTED_MODELS

    def generate(
        self,
        frame: MascotAssetFrame,
        output_path: Path,
        *,
        reference_path: Path | None = None,
        bypass_cache: bool = False,
    ) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        reference_mode = bool(reference_path and reference_path.exists())
        prompt = compose_prompt(frame, reference_mode=reference_mode)
        cache_prompt = (
            f"{prompt}\nreference_sha={_file_sha(reference_path)}"
            if reference_mode and reference_path
            else prompt
        )
        transparent = True

        if output_path.exists() and not bypass_cache:
            logging.info("existing asset for %s", frame.key)
            remove_chroma_key_background(output_path)
            return output_path

        if not bypass_cache and self.cache.lookup(cache_prompt, transparent, self.size, self.model, output_path):
            logging.info("cache hit for %s", frame.key)
            remove_chroma_key_background(output_path)
            self.cache.store(cache_prompt, transparent, self.size, self.model, output_path, frame=frame)
            return output_path

        kwargs = {
            "model": self.model,
            "prompt": prompt,
            "size": self.size,
            "quality": self.quality,
            "output_format": "png",
            "n": 1,
        }
        if transparent and self._supports_background():
            kwargs["background"] = "transparent"

        if reference_mode and reference_path:
            logging.info("editing %s from mascot reference with %s", frame.key, self.model)
            with reference_path.open("rb") as image_file:
                result = self.client.images.edit(image=image_file, **kwargs)
        else:
            logging.info("generating %s with %s", frame.key, self.model)
            result = self.client.images.generate(**kwargs)
        b64 = result.data[0].b64_json
        if not b64:
            raise RuntimeError(f"OpenAI returned no image payload for {frame.key}")

        output_path.write_bytes(base64.b64decode(b64))
        remove_chroma_key_background(output_path)
        self.cache.store(cache_prompt, transparent, self.size, self.model, output_path, frame=frame)
        return output_path


def generate_all(*, bypass_cache: bool = False) -> list[Path]:
    client = OpenAIGamificationImageClient()
    written: list[Path] = []
    reference_paths = {
        "coach": OUTPUT_DIR / "mascot_idle_a.png",
        "explorer": OUTPUT_DIR / "mascot_explorer_idle_a.png",
        "robot": OUTPUT_DIR / "mascot_robot_idle_a.png",
    }
    for frame in ALL_ASSET_FRAMES:
        frame_output = OUTPUT_DIR / f"{frame.key}.png"
        frame_reference = reference_paths[frame.character] if frame.use_reference else None
        written.append(client.generate(
            frame,
            frame_output,
            reference_path=frame_reference,
            bypass_cache=bypass_cache,
        ))

    manifest = {
        "style": SOFT_3D_GAMING_STYLE,
        "model": client.model,
        "size": client.size,
        "output_size_px": OUTPUT_SIZE_PX,
        "characters": [asdict(character) for character in CHARACTERS.values()],
        "frames": [asdict(frame) for frame in ALL_ASSET_FRAMES],
    }
    (OUTPUT_DIR / "metadata.json").write_text(json.dumps(manifest, indent=2, sort_keys=True))
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate UI mascot gamification frames.")
    parser.add_argument("--bypass-cache", action="store_true", help="Force fresh image generation.")
    parser.add_argument("--dry-run", action="store_true", help="Print prompts without calling the image API.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="[gamification-assets] %(message)s")
    if args.dry_run:
        for frame in ALL_ASSET_FRAMES:
            print(f"\n--- {frame.key} ({frame.state}) ---\n{compose_prompt(frame)}")
        return

    for path in generate_all(bypass_cache=args.bypass_cache):
        print(path)


if __name__ == "__main__":
    main()
