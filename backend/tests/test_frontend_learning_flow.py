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
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    expected_copy = "Just decide: know it or not."
    assert "subtitle={ls.headerSubtitle}" in learning_screen
    assert expected_copy in en_locale
    assert "The algorithm adapts the learning path from there." in en_locale


def test_main_flow_starts_on_swipe_screen_with_embedded_filters():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    filters_panel = (FRONTEND_SRC / "components" / "LearningFiltersPanel.tsx").read_text()
    app_routes = (FRONTEND_SRC / "routes" / "appRoutes.ts").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert "CategorySelector" not in card_stack
    assert "showCategorySelector" not in card_stack
    assert "useEffect" in card_stack
    assert "loadFlashcards(categories.selectedCategories)" in card_stack
    assert "categories={categories.allCategories}" in card_stack
    assert "selectedCategories={categories.selectedCategories}" in card_stack
    assert "filtersOpen={mode === 'filters'}" in card_stack
    assert "onOpenLearningFilters()" in card_stack
    assert "feature === 'filters'" in app_routes

    assert "LearningFiltersPanel" in learning_screen
    assert 'label="Filters"' in learning_screen
    assert "selectedCategories.length" in learning_screen
    assert "ls.headerSubtitle" in learning_screen
    assert "Just decide: know it or not." in en_locale
    assert "filtersOpenRequest" not in learning_screen

    assert "lfp.subtitle" in filters_panel
    assert "Apply categories without leaving the deck." in en_locale
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


def test_preference_profile_normalizes_questionnaire_answers_for_learning_queries():
    profile_source = (FRONTEND_SRC / "learning" / "preferenceProfile.ts").read_text()

    assert "export interface LearningPreferenceProfile" in profile_source
    assert "normalizeOnboardingPreferences" in profile_source
    assert "readSavedLearningPreferenceProfile" in profile_source
    assert "buildPreferenceProfileSummary" in profile_source
    assert '"question-2"' in profile_source
    assert "technology" in profile_source
    assert "preferredPartsOfSpeech" in profile_source
    assert "exerciseBias" in profile_source
    assert "semanticDiversityMode" in profile_source
    assert '"question-11"' in profile_source


def test_learning_session_sends_saved_preference_profile_to_adaptive_query():
    api_source = (FRONTEND_SRC / "services" / "api.ts").read_text()
    hook_source = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()

    assert "LearningPreferenceProfile" in api_source
    assert "/api/cards/adaptive/query" in api_source
    assert "method: 'POST'" in api_source
    assert "learningPreferenceProfile" in api_source
    assert "readSavedLearningPreferenceProfile" in hook_source
    assert "preferenceProfile" in hook_source


def test_sentence_features_send_saved_preference_profile_to_grammar_loaders():
    api_source = (FRONTEND_SRC / "services" / "api.ts").read_text()
    nodes_hook_source = (FRONTEND_SRC / "hooks" / "useAvailableGrammarNodes.ts").read_text()
    sentence_challenge_source = (FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx").read_text()

    assert "learningPreferenceProfile" in api_source
    assert "profile_domain" in api_source
    assert "profile_part_of_speech" in api_source
    assert "readSavedLearningPreferenceProfile" in nodes_hook_source
    assert "learningPreferenceProfile: preferenceProfile" in nodes_hook_source
    assert "readSavedLearningPreferenceProfile" in sentence_challenge_source
    assert "learningPreferenceProfile: preferenceProfile" in sentence_challenge_source


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
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert "learningFeedback" in hook_source
    assert "setLearningFeedback" in hook_source
    assert "updatedStatistics.knowledge_level > currentCard.knowledge_level" in hook_source
    assert "copy.learningFeedback.masteryReached" in hook_source
    assert "Mastery {{level}}" in en_locale


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
    app_routes = (FRONTEND_SRC / "routes" / "appRoutes.ts").read_text()

    assert path_home.exists()
    assert "LearningPathHome" in card_stack
    assert "isPathMode(mode)" in card_stack
    assert "onStartLearning" in card_stack
    assert "section === 'learn'" in app_routes
    assert "Today's snapshot" in (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    assert "Ready to level up" in (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    assert "learningSummary" in card_stack
    assert "getPathDisplayValues" in path_home.read_text()
    assert "getMilestones" in path_home.read_text()
    assert "const pathSteps" not in path_home.read_text()
    assert "400-level" in (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()


def test_first_run_vocabulary_onboarding_starts_with_swipe_only_scan():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    onboarding = FRONTEND_SRC / "components" / "FirstVocabularyOnboarding.tsx"
    onboarding_meta = FRONTEND_SRC / "components" / "firstVocabularyOnboardingMeta.ts"
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert onboarding.exists()
    assert onboarding_meta.exists()
    onboarding_source = onboarding.read_text()
    meta_source = onboarding_meta.read_text()
    assert "FIRST_VOCABULARY_ONBOARDING_STORAGE_KEY" not in card_stack
    assert "firstVocabularyOnboardingMeta" in card_stack
    assert "languageApp:firstVocabularyOnboardingDone:v1" in meta_source
    assert "FirstVocabularyOnboarding" in card_stack
    assert "readFirstVocabularyOnboardingDone" in card_stack
    assert "markFirstVocabularyOnboardingDone" in card_stack
    assert "shouldShowFirstVocabularyOnboarding" in card_stack
    assert "localStorage.getItem" not in card_stack
    assert "localStorage.setItem" not in card_stack

    assert "export const MIN_VOCABULARY_SCAN_SWIPES = 20" in meta_source
    assert "export const MAX_VOCABULARY_SCAN_SWIPES = 30" in meta_source
    assert "buildVocabularyInsights" in meta_source
    assert "formatVocabularyCategory" in meta_source
    assert "readFirstVocabularyOnboardingDone" in meta_source
    assert "markFirstVocabularyOnboardingDone" in meta_source
    assert "hasVocabularyHistory" in meta_source
    assert "shouldShowFirstVocabularyOnboarding" in meta_source
    assert "learningSummary?.total_words_practiced" in meta_source
    assert "progress.cards_reviewed > 0" in meta_source
    assert "Vocabulary Scan" in en_locale
    assert "MIN_VOCABULARY_SCAN_SWIPES" in onboarding_source
    assert "MAX_VOCABULARY_SCAN_SWIPES" in onboarding_source
    assert "buildVocabularyInsights" in onboarding_source
    assert "formatVocabularyCategory" in onboarding_source
    assert "onSwipe={handleSwipe}" in onboarding_source
    assert "Library" not in onboarding_source
    assert "Grammar" not in onboarding_source
    assert "Filters" not in onboarding_source


def test_first_run_onboarding_collects_learning_preferences_before_scan():
    onboarding = (FRONTEND_SRC / "components" / "FirstVocabularyOnboarding.tsx").read_text()
    onboarding_meta = (FRONTEND_SRC / "components" / "firstVocabularyOnboardingMeta.ts").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert "'preferences'" in onboarding
    assert "PreferenceQuestionnaire" in onboarding
    assert "saveOnboardingPreferences" in onboarding
    assert "advanceWithMascot('preferences')" in onboarding
    assert "advanceWithMascot('scan')" in onboarding
    assert onboarding.index("'preferences'") < onboarding.index("'scan'")

    assert "ONBOARDING_PREFERENCES_STORAGE_KEY" in onboarding_meta
    assert "languageApp:onboardingPreferences:v1" in onboarding_meta
    assert "writeStorageValue" in onboarding_meta
    assert "localStorage.setItem" not in onboarding_meta

    assert '"preferences"' in en_locale
    assert '"questions"' in en_locale
    assert '"Modern, classic, or both?"' in en_locale
    assert '"Which domains should the app prioritize?"' in en_locale
    assert '"question-10"' in en_locale
    assert '"question-11"' in en_locale


def test_first_run_onboarding_explains_semantic_distance_preference():
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    spec = (REPO_ROOT / "docs" / "superpowers" / "specs" / "2026-05-09-preference-driven-learning-filter-design.md").read_text()
    backend_models = (REPO_ROOT / "backend" / "app" / "models.py").read_text()

    assert '"Semantic distance"' in en_locale
    assert "semantically distant" in en_locale
    assert "cognitive load" in en_locale
    assert "near-synonyms" in en_locale
    assert "semanticDiversityMode" in spec
    assert "semantic similarity" in spec
    assert "embedding" in spec
    assert "semanticDiversityMode" in backend_models


def test_first_run_onboarding_allows_multiple_setup_preferences():
    onboarding = (FRONTEND_SRC / "components" / "FirstVocabularyOnboarding.tsx").read_text()
    onboarding_meta = (FRONTEND_SRC / "components" / "firstVocabularyOnboardingMeta.ts").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert '"id": "question-1"' in en_locale
    assert en_locale.count('"multiSelect": true') >= 10
    assert en_locale.index('"id": "question-1"') < en_locale.index('"multiSelect": true')
    assert '"id": "question-2"' in en_locale
    assert '"multiSelect": true' in en_locale
    assert "OnboardingPreferenceAnswer = string | string[]" in onboarding_meta
    assert "Array.isArray(value)" in onboarding_meta
    assert "isMultiSelectQuestion" in onboarding
    assert "toggleAnswerOption" in onboarding
    assert "hasAnsweredQuestion" in onboarding
    assert "aria-pressed={selected}" in onboarding


def test_onboarding_preference_selection_logic_is_centralized():
    onboarding = (FRONTEND_SRC / "components" / "FirstVocabularyOnboarding.tsx").read_text()
    preference_meta_path = FRONTEND_SRC / "components" / "onboardingPreferenceMeta.ts"

    assert preference_meta_path.exists()
    preference_meta = preference_meta_path.read_text()
    assert "getAnswerOptionIds" in preference_meta
    assert "toggleAnswerOption" in preference_meta
    assert "isQuestionMultiSelect" in preference_meta
    assert "hasAnsweredQuestion" in preference_meta
    assert "toggleAnswerOption" in onboarding
    assert "getAnswerOptionIds" in onboarding
    assert "isQuestionMultiSelect" in onboarding
    assert "hasAnsweredQuestion" in onboarding
    assert "selectSingleOption" not in onboarding
    assert "toggleMultiSelectOption" not in onboarding


def test_first_run_vocabulary_onboarding_explains_analysis_and_science_after_scan():
    onboarding = (FRONTEND_SRC / "components" / "FirstVocabularyOnboarding.tsx").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    it_locale = (FRONTEND_SRC / "i18n" / "locales" / "it.json").read_text()

    assert "You placed {{knownEstimate}} words in your vocabulary" in en_locale
    assert "You can always inspect it in Your Vocabulary" in en_locale
    assert "Hai {{knownEstimate}} parole nel tuo vocabolario" in it_locale
    assert "ogni interazione aggiorna il tuo vocabolario" in it_locale
    assert "Il tuo vocabolario" in it_locale
    assert "Conosci circa" not in it_locale
    assert "La scienza lavora sotto" in it_locale
    assert "Ogni swipe diventa un segnale" in it_locale
    assert "Tu gioca" in it_locale
    assert "MascotReaction" in onboarding
    assert "mascotPersona: 'coach' | 'explorer' | 'robot'" in onboarding
    assert "persona={mascotPersona}" in onboarding
    assert "setInterval" not in onboarding
    assert "Infinity" not in onboarding


def test_first_run_intro_streaming_explains_preference_based_word_filtering():
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    it_locale = (FRONTEND_SRC / "i18n" / "locales" / "it.json").read_text()

    assert "Every person wants to personalize learning around words they will actually use" in en_locale
    assert "Most apps skip this first screening" in en_locale
    assert "words you may never use" in en_locale
    assert "Ogni persona vuole personalizzare l'apprendimento" in it_locale
    assert "parole che forse non userai mai" in it_locale


def test_developer_mermaid_charts_have_a_dedicated_route_and_global_button():
    app_source = (FRONTEND_SRC / "App.tsx").read_text()
    app_header_menu = (FRONTEND_SRC / "components" / "scene" / "AppHeaderMenu.tsx").read_text()
    app_routes = (FRONTEND_SRC / "routes" / "appRoutes.ts").read_text()
    developer_screen = FRONTEND_SRC / "components" / "DeveloperChartsScreen.tsx"
    mermaid_chart = FRONTEND_SRC / "components" / "MermaidChart.tsx"
    package_json = (REPO_ROOT / "frontend" / "package.json").read_text()

    assert developer_screen.exists()
    assert mermaid_chart.exists()
    assert '"mermaid"' in package_json

    assert "{ screen: 'developer', chartSlug: feature }" in app_routes
    assert "section === 'developer'" in app_routes
    assert "route.chartSlug ? `/developer/${route.chartSlug}` : '/developer'" in app_routes

    assert "DeveloperChartsScreen" in app_source
    assert "Code2" in app_header_menu
    assert "Sviluppatore" in app_header_menu
    assert "onNavigate('/developer')" in app_header_menu
    assert "route.screen === 'developer'" in app_source


def test_developer_screen_documents_personalized_learning_system_with_mermaid():
    developer_screen = FRONTEND_SRC / "components" / "DeveloperChartsScreen.tsx"
    mermaid_chart = FRONTEND_SRC / "components" / "MermaidChart.tsx"
    developer_docs = REPO_ROOT / "docs" / "developer-charts.md"

    assert developer_screen.exists()
    assert mermaid_chart.exists()
    assert developer_docs.exists()

    screen_source = developer_screen.read_text()
    chart_source = mermaid_chart.read_text()
    docs_source = developer_docs.read_text()

    assert "MermaidChart" in screen_source
    assert "LearningPreferenceProfile" in screen_source
    assert "/api/cards/adaptive/query" in screen_source
    assert "user_word_statistics" in screen_source
    assert "sentence_challenges" in screen_source
    assert "semanticDiversityMode" in screen_source
    assert screen_source.count("chart: `") >= 4
    assert "AI" not in screen_source
    assert "embedding" not in screen_source
    assert "Semantic similarity" not in screen_source

    assert "import('mermaid')" in chart_source
    assert "mermaid.render" in chart_source
    assert "mermaidRenderQueue" in chart_source
    assert "mermaidRenderCounter" in chart_source
    assert "securityLevel: 'strict'" in chart_source
    assert "Mermaid source fallback" in chart_source

    assert "Developer charts are charts-only" in docs_source
    assert "All implementation details must live inside Mermaid nodes or edges" in docs_source
    assert "No summary chips" in docs_source
    assert "No roadmap logic" in docs_source
    assert "Charts must match code that exists today" in docs_source


def test_developer_filter_chart_explains_only_current_sql_and_python_scoring():
    developer_screen = FRONTEND_SRC / "components" / "DeveloperChartsScreen.tsx"

    assert developer_screen.exists()
    screen_source = developer_screen.read_text()

    assert "FlashcardEntity rows" in screen_source
    assert "Filter: request.language" in screen_source
    assert "Optional: selected_categories" in screen_source
    assert "session.exec query all" in screen_source
    assert "get_user_stats_by_word" in screen_source
    assert "select_preference_weighted_candidates" in screen_source
    assert "Further refinement after SQL" in screen_source
    assert "Weights from onboarding answers" in screen_source
    assert "Preference score ranks candidates" in screen_source
    assert "Python ranking" in screen_source
    assert "domain +8" in screen_source
    assert "tone +3" in screen_source
    assert "word style +2" in screen_source
    assert "part of speech +2" in screen_source
    assert "grammar reserve: 18%" in screen_source
    assert "exploration: 8%" in screen_source
    assert "semanticDiversityMode wide" in screen_source
    assert "round-robin semantic groups" in screen_source
    assert "SQL candidates" not in screen_source
    assert "Runtime filter: SQL + Python scoring" not in screen_source
    assert "SQL candidate query" not in screen_source
    assert "AI" not in screen_source
    assert "embedding" not in screen_source
    assert "Semantic similarity" not in screen_source
    assert "Future AI layer" not in screen_source


def test_developer_screen_renders_charts_without_duplicate_summary_cards():
    developer_screen = FRONTEND_SRC / "components" / "DeveloperChartsScreen.tsx"

    assert developer_screen.exists()
    screen_source = developer_screen.read_text()

    assert "developerCharts.slice(0, 3)" not in screen_source
    assert "chart.facts.slice(0, 3)" not in screen_source
    assert "facts:" not in screen_source
    assert "facts={chart.facts}" not in screen_source
    assert "<MermaidChart" in screen_source


def test_mermaid_chart_component_is_chart_only_without_fact_panels():
    mermaid_chart = FRONTEND_SRC / "components" / "MermaidChart.tsx"

    assert mermaid_chart.exists()
    chart_source = mermaid_chart.read_text()

    assert "facts" not in chart_source
    assert "grid gap-2" not in chart_source
    assert "sm:grid-cols-2" not in chart_source


def test_learning_path_home_offers_sentence_based_grammar_placement():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()
    feature_flow = (FRONTEND_SRC / "gamification" / "featureFlowRegistry.ts").read_text()
    placement_screen = FRONTEND_SRC / "components" / "GrammarPlacementAssessment.tsx"
    placement_challenge = FRONTEND_SRC / "components" / "SentencePlacementChallenge.tsx"
    app_routes = (FRONTEND_SRC / "routes" / "appRoutes.ts").read_text()

    assert placement_screen.exists()
    assert placement_challenge.exists()
    assert "GrammarPlacementAssessment" in card_stack
    assert "mode === 'grammar_placement'" in card_stack
    assert "'grammar_placement'" in card_stack
    assert "section === 'placement' && feature === 'sentence'" in app_routes
    assert "onNavigateToFeature" in path_home
    assert "sentence-placement" in feature_flow
    assert "route: '/placement/sentence'" in feature_flow
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    assert "Sentence Placement" in en_locale
    assert "Compose sentences to check grammar, logic, and function words." in en_locale
    assert "Build a full {{language}} sentence" in en_locale
    assert "SentencePlacementChallenge" in placement_screen.read_text()
    assert "Translate this sentence" in placement_challenge.read_text()
    assert "api.getSentenceChallenges" in placement_challenge.read_text()
    assert "CHALLENGE_TEMPLATES" not in placement_challenge.read_text()
    assert "image_base64" not in placement_challenge.read_text()


def test_your_vocabulary_has_a_route_and_mastery_ranked_view():
    app_routes = (FRONTEND_SRC / "routes" / "appRoutes.ts").read_text()
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()
    api_source = (FRONTEND_SRC / "services" / "api.ts").read_text()
    types_source = (FRONTEND_SRC / "types" / "index.ts").read_text()
    path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()
    vocabulary_screen = FRONTEND_SRC / "components" / "YourVocabularyScreen.tsx"

    assert vocabulary_screen.exists()
    vocabulary_source = vocabulary_screen.read_text()

    assert "'vocabulary'" in app_routes
    assert "section === 'vocabulary'" in app_routes
    assert "return '/vocabulary'" in app_routes
    assert "mode === 'vocabulary'" in card_stack
    assert "YourVocabularyScreen" in card_stack
    assert "getAllWordStatistics" in api_source
    assert "/api/statistics/all" in api_source
    assert "WordStatistics" in types_source
    assert "route: '/vocabulary'" in (FRONTEND_SRC / "gamification" / "featureFlowRegistry.ts").read_text()
    assert "Your Vocabulary" in (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()
    assert "sortVocabularyByMastery" in vocabulary_source
    assert "getVocabularyMasteryStars" in vocabulary_source
    assert "MasteryStars" in vocabulary_source
    assert "bg-success" in vocabulary_source
    assert "bg-accent-amber" in vocabulary_source
    assert "bg-error" in vocabulary_source


def test_learning_path_milestones_are_centralized_outside_the_view():
    path_meta = FRONTEND_SRC / "components" / "learningPathMeta.ts"
    path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()

    assert path_meta.exists()
    meta_source = path_meta.read_text()
    assert "MILESTONE_LEVELS" in meta_source
    assert "getActiveMilestoneIndex" in meta_source
    assert "getPathDisplayValues" in meta_source
    assert "TOTAL_PATH_LEVELS = 400" in meta_source
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


def test_learning_ui_keeps_release_notes_out_of_learning_flow():
    latest_features_panel = FRONTEND_SRC / "components" / "LatestFeaturesPanel.tsx"
    learning_system_menu = (FRONTEND_SRC / "components" / "LearningSystemMenu.tsx").read_text()
    learning_path_home = (FRONTEND_SRC / "components" / "LearningPathHome.tsx").read_text()

    assert not latest_features_panel.exists()
    assert "LatestFeaturesPanel" not in learning_system_menu
    assert "LatestFeaturesPanel" not in learning_path_home
    assert "New Features" not in learning_system_menu
    assert "Latest session updates" not in learning_system_menu
    assert "Product updates" not in learning_path_home


def test_learning_filters_use_gamified_category_components():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    filters_panel = (FRONTEND_SRC / "components" / "LearningFiltersPanel.tsx").read_text()
    category_strip = (FRONTEND_SRC / "components" / "LearningCategoryStrip.tsx").read_text()
    category_meta = (FRONTEND_SRC / "components" / "learningCategoryMeta.tsx").read_text()
    en_locale = (FRONTEND_SRC / "i18n" / "locales" / "en.json").read_text()

    assert "LearningCategoryStrip" in learning_screen
    assert "copy.learningStrip.title" in category_strip
    assert "Topic Deck" in en_locale
    assert "Change filters" in en_locale

    assert "lfp.title" in filters_panel
    assert "Build your topic deck" in en_locale
    assert "Pick the packs you want in the swipe deck." in en_locale
    assert "Game packs" in en_locale
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
