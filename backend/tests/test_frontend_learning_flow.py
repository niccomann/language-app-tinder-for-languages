from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_learning_screen_passes_swipe_direction_to_card_exit_animation():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    card = (FRONTEND_SRC / "components" / "Card.tsx").read_text()
    animations = (FRONTEND_SRC / "utils" / "animations.ts").read_text()

    assert "lastSwipeDirection" in learning_screen
    assert "handleDirectionalSwipe" in learning_screen
    assert "custom={lastSwipeDirection === 'right' ? 1 : -1}" in learning_screen
    assert "onSwipe={handleDirectionalSwipe}" in learning_screen
    assert "custom={swipeDirection === 'right' ? 1 : -1}" in card
    assert "direction > 0 ? 300 : -300" in animations


def test_learning_ui_explains_user_only_decides_known_or_unknown():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()

    expected_copy = "Just decide: know it or not."
    assert expected_copy in learning_screen
    assert "The algorithm adapts the learning path from there." in learning_screen


def test_main_flow_starts_on_swipe_screen_with_embedded_filters():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    filters_panel = (FRONTEND_SRC / "components" / "LearningFiltersPanel.tsx").read_text()

    assert "CategorySelector" not in card_stack
    assert "showCategorySelector" not in card_stack
    assert "useEffect" in card_stack
    assert "loadFlashcards(categories.selectedCategories)" in card_stack
    assert "categories={categories.allCategories}" in card_stack
    assert "selectedCategories={categories.selectedCategories}" in card_stack
    assert "filtersOpen={filtersOpen}" in card_stack
    assert "onFiltersOpenChange={setFiltersOpen}" in card_stack

    assert "LearningFiltersPanel" in learning_screen
    assert 'label="Filters"' in learning_screen
    assert "selectedCategories.length" in learning_screen
    assert "Just decide: know it or not." in learning_screen
    assert "filtersOpenRequest" not in learning_screen

    assert "Apply categories without leaving the deck." in filters_panel
    assert "Select All" in filters_panel
    assert "Clear" in filters_panel


def test_learning_session_uses_adaptive_flashcard_endpoint():
    api_source = (FRONTEND_SRC / "services" / "api.ts").read_text()
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()
    types_source = (FRONTEND_SRC / "types" / "index.ts").read_text()

    assert "AdaptiveFlashcard" in types_source
    assert "getAdaptiveFlashcards" in api_source
    assert "/api/cards/adaptive" in api_source
    assert "api.getAdaptiveFlashcards" in hook_source
    assert "selectedCategories" in hook_source
    assert "cards.filter(" not in hook_source


def test_learning_session_fetches_adaptive_summary_for_level_dashboard():
    api_source = (FRONTEND_SRC / "services" / "api.ts").read_text()
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()
    types_source = (FRONTEND_SRC / "types" / "index.ts").read_text()

    assert "AdaptiveLearningSummary" in types_source
    assert "path_level" in types_source
    assert "max_path_level" in types_source
    assert "xp_to_next_level" in types_source
    assert "path_level_progress" in types_source
    assert "getAdaptiveLearningSummary" in api_source
    assert "/api/statistics/adaptive-summary" in api_source
    assert "learningSummary" in hook_source
    assert "api.getAdaptiveLearningSummary" in hook_source


def test_swipe_waits_for_adaptive_statistics_update_before_advancing():
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()

    assert "await api.updateWordStatistics" in hook_source
    assert "api.updateWordStatistics(currentCard.word, known, currentCard.language).catch" not in hook_source
    assert hook_source.index("await api.updateWordStatistics") < hook_source.index("setCurrentIndex(prev => prev + 1)")


def test_swipe_surfaces_level_up_feedback_before_advancing():
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()

    assert "learningFeedback" in hook_source
    assert "setLearningFeedback" in hook_source
    assert "updatedStatistics.knowledge_level > currentCard.knowledge_level" in hook_source
    assert "Mastery " in hook_source


def test_card_shows_word_mastery_badge_for_per_word_mastery():
    card = (FRONTEND_SRC / "components" / "Card.tsx").read_text()
    word_mastery_badge = FRONTEND_SRC / "components" / "WordMasteryBadge.tsx"

    assert word_mastery_badge.exists()
    assert "WordMasteryBadge" in card
    assert "LearningLevelBadge" not in card
    assert "knowledge_level" in card
    assert "selection_reason" in word_mastery_badge.read_text()
    assert "Mastery {level}" in word_mastery_badge.read_text()


def test_learning_path_home_is_primary_entry_to_swipe_session():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    path_home = FRONTEND_SRC / "components" / "LearningPathHome.tsx"

    assert path_home.exists()
    assert "LearningPathHome" in card_stack
    assert "screenMode" in card_stack
    assert "setScreenMode('session')" in card_stack
    assert "Daily Learning Snapshot" in path_home.read_text()
    assert "Review German Level" in path_home.read_text()
    assert "learningSummary" in card_stack
    assert "getPathDisplayValues" in path_home.read_text()
    assert "LEARNING_PATH_MILESTONES" in path_home.read_text()
    assert "const pathSteps" not in path_home.read_text()
    assert "400-level" in path_home.read_text()


def test_learning_path_milestones_are_centralized_outside_the_view():
    path_meta = FRONTEND_SRC / "components" / "learningPathMeta.ts"
    path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()

    assert path_meta.exists()
    meta_source = path_meta.read_text()
    assert "LEARNING_PATH_MILESTONES" in meta_source
    assert "getActiveMilestoneIndex" in meta_source
    assert "getPathDisplayValues" in meta_source
    assert "level: 400" in meta_source
    assert "learningPathMeta" in path_home


def test_learning_screen_renders_session_feedback_banner():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()

    assert "LearningFeedbackBanner" in learning_screen
    assert "learningFeedback" in learning_screen


def test_learning_ui_explains_adaptive_mastery_system():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    learning_system_menu = (FRONTEND_SRC / "components" / "LearningSystemMenu.tsx").read_text()

    assert "LearningSystemMenu" in learning_screen
    assert "One memory database tracks every word you know, miss, or are still learning." in learning_system_menu
    assert "Your global path can grow through 400 levels." in learning_system_menu
    assert "Each word still has a focused mastery score from 1 to 10." in learning_system_menu
    assert "Future sentences can mix strong words with weaker words" in learning_system_menu


def test_learning_ui_explains_latest_frontend_features():
    learning_system_menu = (FRONTEND_SRC / "components" / "LearningSystemMenu.tsx").read_text()

    assert "id=\"latest-learning-features\"" in learning_system_menu
    assert "New Features / Nuove feature" in learning_system_menu
    assert "Latest session updates" in learning_system_menu
    assert "The home screen now starts from the 400-level German path." in learning_system_menu
    assert "Cards show a 1-to-10 word mastery badge, separate from the global path level." in learning_system_menu
    assert "After each swipe, the session can show level-up feedback before the next card." in learning_system_menu
    assert "The visible topic filters stay inside the swipe experience" in learning_system_menu
    assert learning_system_menu.index("id=\"latest-learning-features\"") < learning_system_menu.index("{isOpen &&")


def test_learning_filters_use_gamified_category_components():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    filters_panel = (FRONTEND_SRC / "components" / "LearningFiltersPanel.tsx").read_text()
    category_strip = (FRONTEND_SRC / "components" / "LearningCategoryStrip.tsx").read_text()
    category_meta = (FRONTEND_SRC / "components" / "learningCategoryMeta.tsx").read_text()

    assert "LearningCategoryStrip" in learning_screen
    assert "Topic Deck" in category_strip
    assert "Edit topic filters" in category_strip

    assert "Build your topic deck" in filters_panel
    assert "Pick the packs you want in the swipe deck." in filters_panel
    assert "Game packs" in filters_panel
    assert "getLearningCategoryMeta" in filters_panel

    assert "Animal Pack" in category_meta
    assert "Concept Pack" in category_meta


def test_clustered_d3_nodes_show_images_inside_circles_by_default():
    clustered_nodes = (FRONTEND_SRC / "components" / "ClusteredNodes.tsx").read_text()

    assert "useState(true)" in clustered_nodes
    assert "clipPath" in clustered_nodes
    assert "append('image')" in clustered_nodes
    assert "clip-path" in clustered_nodes
    assert "data:image/jpeg;base64" in clustered_nodes
