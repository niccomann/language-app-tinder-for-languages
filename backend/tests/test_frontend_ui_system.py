from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = REPO_ROOT / "frontend"
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_primary_views_share_common_ui_scaffolding():
    ui_index = (FRONTEND_SRC / "components" / "ui" / "index.ts").read_text()
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    learning_path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()
    grammar_lab = (FRONTEND_SRC / "components" / "GrammarLab.tsx").read_text()
    words_library = (FRONTEND_SRC / "components" / "WordsLibraryEnriched.tsx").read_text()
    completion_screen = (FRONTEND_SRC / "components" / "CompletionScreen.tsx").read_text()

    assert "AppScreen" in ui_index
    assert "ScreenHeader" in ui_index
    assert "PillTabs" in ui_index
    assert "SurfacePanel" in ui_index

    for view in (learning_screen, learning_path_home, grammar_lab, words_library):
        assert "AppScreen" in view
        assert "ScreenHeader" in view

    assert "PillTabs" in grammar_lab
    assert "SurfacePanel" in learning_screen
    assert "SurfacePanel" in learning_path_home
    assert "SurfacePanel" in words_library
    assert "AppScreen" in completion_screen
    assert "ScreenHeader" in completion_screen
    assert "SurfacePanel" in completion_screen


def test_grammar_lab_uses_shared_tabs_instead_of_duplicate_button_blocks():
    grammar_lab = (FRONTEND_SRC / "components" / "GrammarLab.tsx").read_text()

    assert "const LAB_TABS" in grammar_lab
    assert grammar_lab.count("setActiveView(") <= 2
    assert "Grammar Lab 🧪" not in grammar_lab
    assert "Componi Frase 🎮" not in grammar_lab


def test_grammar_lab_has_empty_state_for_missing_sentence_data():
    grammar_lab = (FRONTEND_SRC / "components" / "GrammarLab.tsx").read_text()

    assert "No grammar sentences yet" in grammar_lab
    assert "Build Sentence" in grammar_lab
    assert "SurfacePanel" in grammar_lab
    assert "activeView === 'graph' && currentSentence" in grammar_lab


def test_sentence_builder_is_embedded_in_grammar_lab_not_a_fullscreen_overlay():
    sentence_builder = (FRONTEND_SRC / "components" / "SentenceBuilder.tsx").read_text()
    grammar_lab = (FRONTEND_SRC / "components" / "GrammarLab.tsx").read_text()
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert "fixed inset-0 z-50 flex flex-col" not in sentence_builder
    assert "Loading Sentence Builder...\" fullScreen" not in sentence_builder
    assert "<SentenceBuilder />" in grammar_lab
    assert "Loading...\" fullScreen" not in fun_builder


def test_sentence_builders_share_the_same_word_bank_component():
    word_bank = FRONTEND_SRC / "components" / "GrammarWordBank.tsx"
    builder_frame = FRONTEND_SRC / "components" / "GrammarBuilderFrame.tsx"
    assert word_bank.exists()
    assert builder_frame.exists()

    word_bank_source = word_bank.read_text()
    builder_frame_source = builder_frame.read_text()
    sentence_builder = (FRONTEND_SRC / "components" / "SentenceBuilder.tsx").read_text()
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert "export function GrammarWordBank" in word_bank_source
    assert "export function GrammarBuilderFrame" in builder_frame_source
    assert "GrammarWordBank" in builder_frame_source
    assert "max-w-7xl" in builder_frame_source
    assert "h-full min-h-0 overflow-y-auto" in builder_frame_source
    assert "useGrammarNodeFilters" in word_bank_source
    assert "Nouns" in word_bank_source
    assert "Verbs" in word_bank_source
    assert "Pronouns" in word_bank_source
    assert "Adverbs" in word_bank_source
    assert "Prepositions" in word_bank_source
    assert "Articles" in word_bank_source
    assert "Conjunctions" in word_bank_source

    assert "<GrammarBuilderFrame" in sentence_builder
    assert "<GrammarBuilderFrame" in fun_builder
    assert "<GrammarWordBank" not in sentence_builder
    assert "<GrammarWordBank" not in fun_builder
    assert "groupedNodes" not in sentence_builder
    assert "groupedNodes" not in fun_builder
    assert "Filtra parole:" not in fun_builder
    assert "Parole disponibili" not in fun_builder


def test_fun_sentence_builder_uses_shared_zoom_controls():
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert "ZoomControlBar" in fun_builder
    assert "<ZoomIn" not in fun_builder
    assert "<ZoomOut" not in fun_builder
    assert "<Focus" not in fun_builder


def test_grammar_node_types_include_sentence_function_words():
    types_source = (FRONTEND_SRC / "types" / "index.ts").read_text()
    colors_source = (FRONTEND_SRC / "utils" / "grammarColors.ts").read_text()
    word_bank_source = (FRONTEND_SRC / "components" / "GrammarWordBank.tsx").read_text()

    assert "| 'article'" in types_source
    assert "| 'conjunction'" in types_source
    assert "article: '#" in colors_source
    assert "conjunction: '#" in colors_source
    assert "node.type === 'article' || node.part_of_speech === 'article'" in word_bank_source
    assert "node.type === 'conjunction' || node.part_of_speech === 'conjunction'" in word_bank_source


def test_core_ui_geometry_uses_shared_shape_system():
    geometry = FRONTEND_SRC / "components" / "ui" / "geometry.ts"
    assert geometry.exists()

    geometry_source = geometry.read_text()
    assert "UI_RADIUS" in geometry_source
    assert "surface:" in geometry_source
    assert "control:" in geometry_source
    assert "pill:" in geometry_source
    assert "touchIcon:" in geometry_source

    checked_components = [
        "components/ui/SurfacePanel.tsx",
        "components/ui/StatCard.tsx",
        "components/Card.tsx",
        "components/LearningFiltersPanel.tsx",
        "components/LearningCategoryStrip.tsx",
        "components/LearningSystemMenu.tsx",
        "components/LearningPathHome.tsx",
        "components/WordMasteryBadge.tsx",
        "components/LearningFeedbackBanner.tsx",
        "components/ProgressBar.tsx",
        "components/CompletionScreen.tsx",
        "components/WordsLibraryEnriched.tsx",
        "components/GrammarWordBank.tsx",
        "components/SentenceBuilder.tsx",
    ]

    for relative_path in checked_components:
        source = (FRONTEND_SRC / relative_path).read_text()
        assert "UI_RADIUS" in source
        assert "rounded-[2rem]" not in source
        assert "rounded-3xl" not in source


def test_fun_sentence_builder_reset_clears_d3_connection_ref():
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert "connectionsRef.current = []" in fun_builder


def test_fun_sentence_builder_reuses_sentence_footer_helpers():
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert "const renderSentenceActions" in fun_builder
    assert "const renderValidationPanel" in fun_builder
    assert fun_builder.count("onClick={handleValidate}") == 1
    assert fun_builder.count("onClick={handleReset}") == 1
    assert fun_builder.count("getStatusIcon(validationResult.status)") == 1


def test_sentence_builders_share_sentence_ordering_utility():
    ordering = FRONTEND_SRC / "utils" / "sentenceBuilderOrder.ts"
    sentence_builder = (FRONTEND_SRC / "components" / "SentenceBuilder.tsx").read_text()
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert ordering.exists()
    ordering_source = ordering.read_text()
    assert "export function buildOrderedSentence" in ordering_source
    assert "fromIds" in ordering_source
    assert "orderedLabels" in ordering_source

    assert "buildOrderedSentence" in sentence_builder
    assert "buildOrderedSentence" in fun_builder
    assert "const getBuiltSentence" not in sentence_builder
    assert "const getBuiltSentence" not in fun_builder
    assert "const orderedLabels: string[]" not in sentence_builder
    assert "const orderedLabels: string[]" not in fun_builder


def test_sentence_builders_share_available_nodes_hook():
    hook = FRONTEND_SRC / "hooks" / "useAvailableGrammarNodes.ts"
    sentence_builder = (FRONTEND_SRC / "components" / "SentenceBuilder.tsx").read_text()
    fun_builder = (FRONTEND_SRC / "components" / "FunSentenceBuilder.tsx").read_text()

    assert hook.exists()
    hook_source = hook.read_text()
    assert "export function useAvailableGrammarNodes" in hook_source
    assert "api.getAvailableNodes()" in hook_source

    assert "useAvailableGrammarNodes" in sentence_builder
    assert "useAvailableGrammarNodes" in fun_builder
    assert "api.getAvailableNodes()" not in sentence_builder
    assert "api.getAvailableNodes()" not in fun_builder
    assert "loadAvailableNodes" not in sentence_builder
    assert "loadAvailableNodes" not in fun_builder


def test_app_mode_treats_loopback_hosts_as_development():
    app_mode = (FRONTEND_SRC / "config" / "appMode.ts").read_text()

    assert "'127.0.0.1'" in app_mode


def test_browser_storage_access_is_centralized():
    browser_storage = FRONTEND_SRC / "utils" / "browserStorage.ts"
    theme_context = (FRONTEND_SRC / "contexts" / "ThemeContext.tsx").read_text()
    onboarding_meta = (FRONTEND_SRC / "components" / "firstVocabularyOnboardingMeta.ts").read_text()
    guide_storage = (FRONTEND_SRC / "gamification" / "featureGuideStorage.ts").read_text()
    guide_overlay = (FRONTEND_SRC / "components" / "GameGuideOverlay.tsx").read_text()

    assert browser_storage.exists()
    storage_source = browser_storage.read_text()
    assert "readStorageValue" in storage_source
    assert "writeStorageValue" in storage_source
    assert "localStorage.getItem" in storage_source
    assert "localStorage.setItem" in storage_source

    assert "readStorageValue" in theme_context
    assert "writeStorageValue" in theme_context
    assert "readStorageValue" in onboarding_meta
    assert "writeStorageValue" in onboarding_meta
    assert "readStorageValue" in guide_storage
    assert "writeStorageValue" in guide_storage
    assert "localStorage.getItem" not in theme_context
    assert "localStorage.setItem" not in theme_context
    assert "localStorage.getItem" not in onboarding_meta
    assert "localStorage.setItem" not in onboarding_meta
    assert "localStorage.getItem" not in guide_overlay
    assert "localStorage.setItem" not in guide_overlay


def test_playwright_specs_share_app_test_helpers():
    helper = FRONTEND_ROOT / "test-utils" / "appTestHelpers.ts"
    assert helper.exists()

    helper_source = helper.read_text()
    assert "export const APP_URL" in helper_source
    assert "export const API_URL" in helper_source
    assert "markFirstVocabularyOnboardingDone" in helper_source
    assert "mockLearningApi" in helper_source
    assert "expectNoHorizontalOverflow" in helper_source
    assert "expectInViewport" in helper_source

    specs = sorted(FRONTEND_ROOT.glob("*.spec.ts"))
    assert specs
    for spec in specs:
        source = spec.read_text()
        assert "http://127.0.0.1:5173" not in source
        assert "http://localhost:5173" not in source
        assert "http://127.0.0.1:8501" not in source

    swipe_spec = (FRONTEND_ROOT / "test-swipe-first.spec.ts").read_text()
    assert "from './test-utils/appTestHelpers'" in swipe_spec
    assert "page.route('**/api/library/filters?**'" not in swipe_spec
    assert "const MOCK_CARDS" not in swipe_spec


def test_words_library_register_filter_is_wired_to_api_request():
    words_library = (FRONTEND_SRC / "components" / "WordsLibraryEnriched.tsx").read_text()

    assert "registerFilter" in words_library
    assert "setRegisterFilter" in words_library
    assert "register: registerFilter || undefined" in words_library
    assert "console.log(e.target.value)" not in words_library


def test_filter_views_use_shared_select_geometry():
    ui_index = (FRONTEND_SRC / "components" / "ui" / "index.ts").read_text()
    filter_select = FRONTEND_SRC / "components" / "ui" / "FilterSelect.tsx"
    words_library = (FRONTEND_SRC / "components" / "WordsLibraryEnriched.tsx").read_text()
    grammar_filter = (FRONTEND_SRC / "components" / "GrammarNodeFilterBar.tsx").read_text()
    linguistic_filter = (FRONTEND_SRC / "components" / "LinguisticFilterBar.tsx").read_text()

    assert filter_select.exists()
    assert "FilterSelect" in ui_index
    assert "UI_RADIUS.control" in filter_select.read_text()

    for source in (words_library, grammar_filter, linguistic_filter):
        assert "FilterSelect" in source

    assert "<select" not in words_library


def test_word_display_metadata_is_centralized():
    display_meta = FRONTEND_SRC / "utils" / "wordDisplayMeta.ts"
    assert display_meta.exists()

    display_meta_source = display_meta.read_text()
    assert "CATEGORY_COLORS" in display_meta_source
    assert "CEFR_BADGE_CLASSES" in display_meta_source
    assert "GENDER_BADGE_META" in display_meta_source
    assert "FREQUENCY_ICONS" in display_meta_source
    assert "CONFUSION_LEVEL_CLASSES" in display_meta_source

    checked_components = [
        "components/GrammarLab.tsx",
        "components/EmbeddedWordCloud.tsx",
        "components/WordDetailModal.tsx",
        "components/WordsLibraryEnriched.tsx",
        "components/WordDetailModalEnriched.tsx",
    ]

    for relative_path in checked_components:
        source = (FRONTEND_SRC / relative_path).read_text()
        assert "wordDisplayMeta" in source
        assert "const CATEGORY_COLORS" not in source
        assert "const CEFR_COLORS" not in source
        assert "const GENDER_LABELS" not in source
        assert "const FREQUENCY_ICONS" not in source
        assert "const CONFUSION_COLORS" not in source


def test_common_controls_use_shared_interaction_tokens():
    geometry = (FRONTEND_SRC / "components" / "ui" / "geometry.ts").read_text()
    stat_card = (FRONTEND_SRC / "components" / "ui" / "StatCard.tsx").read_text()
    nav_button = (FRONTEND_SRC / "components" / "ui" / "NavButton.tsx").read_text()
    completion_screen = (FRONTEND_SRC / "components" / "CompletionScreen.tsx").read_text()
    theme_toggle = (FRONTEND_SRC / "components" / "ui" / "ThemeToggle.tsx").read_text()
    pill_tabs = (FRONTEND_SRC / "components" / "ui" / "PillTabs.tsx").read_text()
    zoom_controls = (FRONTEND_SRC / "components" / "ui" / "ZoomControlBar.tsx").read_text()
    audio_button = (FRONTEND_SRC / "components" / "AudioButton.tsx").read_text()

    assert "UI_INTERACTION" in geometry
    for source in (
        stat_card,
        nav_button,
        completion_screen,
        theme_toggle,
        pill_tabs,
        zoom_controls,
        audio_button,
    ):
        assert "UI_INTERACTION" in source


def test_completion_screen_reuses_shared_navigation_buttons():
    completion_screen = (FRONTEND_SRC / "components" / "CompletionScreen.tsx").read_text()

    assert "NavButton" in completion_screen
    assert "secondaryActionBase" not in completion_screen
    assert "border-purple-300" not in completion_screen
    assert "border-blue-300" not in completion_screen


def test_hierarchy_sunburst_uses_shared_tabs_and_no_duplicate_zoom_hints():
    hierarchy = (FRONTEND_SRC / "components" / "HierarchySunburst.tsx").read_text()

    assert "PillTabs" in hierarchy
    assert "<PillTabs" in hierarchy
    assert "Click sector to zoom in" not in hierarchy
    assert "Click center to zoom out" not in hierarchy
    assert "<ZoomIn" not in hierarchy
    assert "<ZoomOut" not in hierarchy
