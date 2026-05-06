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


def test_swipe_waits_for_adaptive_statistics_update_before_advancing():
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()

    assert "await api.updateWordStatistics" in hook_source
    assert "api.updateWordStatistics(currentCard.word, known, currentCard.language).catch" not in hook_source
    assert hook_source.index("await api.updateWordStatistics") < hook_source.index("setCurrentIndex(prev => prev + 1)")


def test_learning_ui_explains_adaptive_mastery_system():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    learning_system_menu = (FRONTEND_SRC / "components" / "LearningSystemMenu.tsx").read_text()

    assert "LearningSystemMenu" in learning_screen
    assert "One memory database tracks every word you know, miss, or are still learning." in learning_system_menu
    assert "Each swipe updates a mastery score from 1 to 10." in learning_system_menu
    assert "Future sentences can mix strong words with weaker words" in learning_system_menu


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
