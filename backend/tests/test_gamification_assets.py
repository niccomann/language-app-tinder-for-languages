from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_gamification_assets_have_provider_manifest_and_consistent_style():
    manifest = FRONTEND_SRC / "gamification" / "mascotManifest.ts"
    component = FRONTEND_SRC / "components" / "MascotReaction.tsx"
    provider = REPO_ROOT / "scripts" / "generate_gamification_assets.py"

    assert manifest.exists()
    assert component.exists()
    assert provider.exists()

    manifest_source = manifest.read_text()
    component_source = component.read_text()
    provider_source = provider.read_text()

    assert "MascotReactionState" in manifest_source
    assert "idle" in manifest_source
    assert "correct" in manifest_source
    assert "wrong" in manifest_source
    assert "levelUp" in manifest_source
    assert "mascot_idle_a" in manifest_source
    assert "mascot_correct_a" in manifest_source
    assert "mascot_wrong_a" in manifest_source
    assert "soft 3D gaming sticker" in provider_source
    assert "no text, no letters" in provider_source
    assert "OpenAI" in provider_source
    assert "AssetCache" in provider_source
    assert "background" in provider_source
    assert "gpt-image-2" in provider_source
    assert "pixel art" not in provider_source.lower()
    assert "framer-motion" in component_source
    assert "prefers-reduced-motion" in component_source
    assert "data-testid=\"mascot-reaction\"" in component_source


def test_sentence_placement_uses_mascot_for_ground_truth_feedback():
    placement = (FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx").read_text()

    assert "MascotReaction" in placement
    assert "reactionState" in placement
    assert "status === 'correct'" in placement
    assert "status === 'wrong'" in placement
    assert "data-testid=\"placement-word-option\"" in placement


def test_learning_feedback_banner_uses_level_up_mascot_state():
    banner = (FRONTEND_SRC / "components" / "LearningFeedbackBanner.tsx").read_text()

    assert "MascotSpeechCallout" in banner
    assert "feedback.tone === 'level_up' ? 'levelUp' : 'correct'" in banner


def test_mascot_motion_is_event_driven_not_continuous():
    component = (FRONTEND_SRC / "components" / "MascotReaction.tsx").read_text()
    placement = (FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx").read_text()

    assert "setInterval" not in component
    assert "Infinity" not in component
    assert "eventKey" in component
    assert "data-motion-mode" in component
    assert "state === 'idle' ? 'still' : 'event'" in component
    assert "reactionEventId" in placement
    assert "setReactionEventId" in placement


def test_mascot_roster_has_multiple_personas_and_event_motion_presets():
    manifest = (FRONTEND_SRC / "gamification" / "mascotManifest.ts").read_text()
    component = (FRONTEND_SRC / "components" / "MascotReaction.tsx").read_text()
    provider = (REPO_ROOT / "scripts" / "generate_gamification_assets.py").read_text()

    assert "MascotPersona" in manifest
    assert "mascotPersonas" in manifest
    assert "mascotPersonaOrder" in manifest
    assert "'coach'" in manifest
    assert "'explorer'" in manifest
    assert "'robot'" in manifest
    assert "mascot_explorer_idle_a" in manifest
    assert "mascot_explorer_correct_b" in manifest
    assert "mascot_robot_wrong_a" in manifest
    assert "mascot_robot_level_up_b" in manifest
    assert "mascotFramesByState" not in manifest

    assert "MascotCharacterSpec" in provider
    assert "character='explorer'" in provider
    assert "character='robot'" in provider

    assert "data-mascot-persona" in component
    assert "data-motion-profile" in component
    assert "resolveMascotPersona" in component
    assert "personaMotionProfiles" in component


def test_mascot_is_rendered_as_transparent_cutout_without_colored_panel():
    component = (FRONTEND_SRC / "components" / "MascotReaction.tsx").read_text()

    assert "bg-gradient-to-br" not in component
    assert "stateRing" not in component
    assert "overflow-hidden" not in component
    assert "bg-transparent" in component
    assert "drop-shadow" in component


def test_sentence_placement_commands_are_more_gamified_without_busy_motion():
    placement = (FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx").read_text()

    assert "Sparkles" in placement
    assert "Star" in placement
    assert "Trophy" in placement
    assert "XP reward" in placement
    assert "Combo" in placement
    assert "Quest" in placement
    assert "motion" not in placement.lower()


def test_static_game_signals_are_centralized_and_used_across_core_views():
    badge = FRONTEND_SRC / "components" / "ui" / "GameSignalBadge.tsx"
    ui_index = (FRONTEND_SRC / "components" / "ui" / "index.ts").read_text()
    placement = (FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx").read_text()
    path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()
    library = (FRONTEND_SRC / "components" / "WordsLibraryEnriched.tsx").read_text()
    grammar_lab = (FRONTEND_SRC / "components" / "GrammarLab.tsx").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert badge.exists()
    badge_source = badge.read_text()
    assert "GameSignalTone" in badge_source
    assert "GameSignalBadge" in badge_source
    assert "aria-label" in badge_source
    assert "motion" not in badge_source.lower()
    assert "export { GameSignalBadge }" in ui_index

    for source in [placement, path_home, library, grammar_lab]:
        assert "GameSignalBadge" in source

    assert "Daily Quest" in en_locale
    assert "Streak Shield" in en_locale
    assert "Collection Quest" in en_locale
    assert "Mastery Loot" in en_locale
    assert "Grammar Quest" in grammar_lab
    assert "Combo Lab" in grammar_lab


def test_feature_guides_define_many_cutout_assets_and_route_mapping():
    manifest = FRONTEND_SRC / "gamification" / "featureGuideManifest.ts"
    guide_ids = FRONTEND_SRC / "gamification" / "featureGuideIds.ts"
    guide_storage = FRONTEND_SRC / "gamification" / "featureGuideStorage.ts"
    overlay = FRONTEND_SRC / "components" / "GameGuideOverlay.tsx"
    resolver = FRONTEND_SRC / "gamification" / "featureGuideResolver.ts"
    app = FRONTEND_SRC / "App.tsx"
    provider = REPO_ROOT / "scripts" / "generate_gamification_assets.py"

    assert manifest.exists()
    assert guide_ids.exists()
    assert guide_storage.exists()
    assert overlay.exists()
    assert resolver.exists()

    manifest_source = manifest.read_text()
    resolver_source = resolver.read_text()
    guide_ids_source = guide_ids.read_text()
    guide_storage_source = guide_storage.read_text()
    overlay_source = overlay.read_text()
    app_source = app.read_text()
    provider_source = provider.read_text()

    assert manifest_source.count("guide_") >= 26
    assert manifest_source.count("frames: [") >= 13
    assert "FeatureGuideId" in manifest_source
    assert "featureGuides" in manifest_source
    assert "resolveFeatureGuideForRoute" in manifest_source
    assert "featureGuideIds" in guide_ids_source
    assert "FeatureGuideId" in guide_ids_source

    for guide_id in [
        "vocabularyScan",
        "learningPath",
        "learningFilters",
        "learningSystem",
        "sentencePlacement",
        "library",
        "grammarGraph",
        "wordCloud",
        "sentenceGraphBuilder",
        "sentenceComposer",
        "clusters",
        "dialects",
        "hierarchy",
    ]:
        assert guide_id in manifest_source
        assert guide_id in guide_ids_source

    for route_case in [
        "route.screen === 'learning'",
        "route.screen === 'library'",
        "featureGuideByRoute",
        "routeStatePath(route)",
    ]:
        assert route_case in resolver_source

    assert "GUIDE_ASSET_FRAMES" in provider_source
    assert provider_source.count("guide_") >= 26
    assert "non-technical language learner" in provider_source
    assert "flat solid" in provider_source

    assert "framer-motion" in overlay_source
    assert "useReducedMotion" in overlay_source
    assert "setInterval" not in overlay_source
    assert "Infinity" not in overlay_source
    assert "data-testid=\"game-guide-overlay\"" in overlay_source
    assert "data-layout=\"fullscreen\"" in overlay_source
    assert "aria-modal=\"true\"" in overlay_source
    assert "role=\"dialog\"" in overlay_source
    assert "data-motion-mode=\"event\"" in overlay_source
    assert "data-asset-rendering=\"transparent-cutout\"" in overlay_source
    assert "FEATURE_GUIDE_STORAGE_PREFIX" in guide_storage_source
    assert "languageApp:featureGuideSeen:" in guide_storage_source
    assert "readStorageValue" in guide_storage_source
    assert "writeStorageValue" in guide_storage_source
    assert "localStorage.getItem" not in overlay_source
    assert "localStorage.setItem" not in overlay_source
    assert "fixed inset-0" in overlay_source

    assert "GameGuideOverlay" in app_source
    assert "resolveFeatureGuideForRoute(route)" in app_source
