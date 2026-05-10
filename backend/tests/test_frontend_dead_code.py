from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_legacy_frontend_entrypoints_are_not_active_code():
    stale_paths = [
        FRONTEND_SRC / "pages" / "LearningPage.tsx",
        FRONTEND_SRC / "pages" / "CompletionPage.tsx",
        FRONTEND_SRC / "components" / "WordsLibrary.tsx",
        FRONTEND_SRC / "components" / "GrammarGraph.tsx",
        FRONTEND_SRC / "components" / "WordCloud.tsx",
        FRONTEND_SRC / "components" / "StatsSummary.tsx",
        FRONTEND_SRC / "components" / "game",
        FRONTEND_SRC / "hooks" / "useWordStats.ts",
        FRONTEND_SRC / "utils" / "gamification.ts",
        FRONTEND_SRC / "App.css",
        FRONTEND_SRC / "assets" / "react.svg",
    ]

    assert [path for path in stale_paths if path.exists()] == []


def test_active_frontend_does_not_depend_on_react_router_dom():
    active_files = [
        path
        for path in FRONTEND_SRC.rglob("*")
        if path.is_file() and "deprecated" not in path.parts
    ]

    offenders = [
        path.relative_to(FRONTEND_SRC)
        for path in active_files
        if "react-router-dom" in path.read_text(errors="ignore")
    ]

    assert offenders == []


def test_card_stack_does_not_own_app_level_routes():
    card_stack = (FRONTEND_SRC / "components" / "CardStack.tsx").read_text()

    assert "from './WordsLibraryEnriched'" not in card_stack
    assert "from './GrammarLab'" not in card_stack
    assert "showWordsLibrary" not in card_stack
    assert "showGrammarLab" not in card_stack


def test_frontend_api_has_no_legacy_library_or_summary_methods():
    api_service = (FRONTEND_SRC / "services" / "api.ts").read_text()

    assert "getWordsLibrary" not in api_service
    assert "/api/words/library" not in api_service
    assert "getStatisticsSummary" not in api_service
    assert "/api/statistics/summary" not in api_service


def test_frontend_readme_does_not_document_removed_flows():
    readme = (FRONTEND_SRC / "README.md").read_text()

    assert "useWordStats" not in readme
    assert "trackingApi" not in readme
    assert "startTracking" not in readme
    assert "stopTracking" not in readme
    assert "MINIMUM_INTERACTIONS" not in readme


def test_stale_playwright_debug_specs_are_removed_from_active_suite():
    frontend_root = REPO_ROOT / "frontend"
    pipeline = (REPO_ROOT / "scripts" / "pipeline.sh").read_text()

    assert not (frontend_root / "test-debug.spec.ts").exists()
    assert not (frontend_root / "test-swipe.spec.ts").exists()
    assert "npx playwright test)" in pipeline


def test_frontend_maintenance_notes_document_shared_surfaces():
    maintenance_doc = REPO_ROOT / "docs" / "frontend-maintenance.md"
    assert maintenance_doc.exists()

    doc = maintenance_doc.read_text()
    assert "appRoutes.ts" in doc
    assert "components/ui" in doc
    assert "browserStorage.ts" in doc
    assert "firstVocabularyOnboardingMeta.ts" in doc
    assert "frontend/test-utils/appTestHelpers.ts" in doc


def test_active_frontend_errors_use_shared_reporter():
    reporter = FRONTEND_SRC / "utils" / "clientError.ts"
    assert reporter.exists()

    reporter_source = reporter.read_text()
    assert "reportClientError" in reporter_source
    assert "console.error" in reporter_source

    active_files = [
        path
        for root in ("components", "hooks", "gamification")
        for path in (FRONTEND_SRC / root).rglob("*")
        if path.suffix in {".ts", ".tsx"} and "deprecated" not in path.parts
    ]

    offenders = [
        path.relative_to(FRONTEND_SRC)
        for path in active_files
        if "console.error" in path.read_text(errors="ignore")
    ]

    assert offenders == []
