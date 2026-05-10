import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def read_project_file(relative_path: str) -> str:
    return (PROJECT_ROOT / relative_path).read_text(encoding="utf-8")


def test_active_product_docs_do_not_advertise_deprecated_video_learning():
    readme = read_project_file("README.md")

    assert "Video Learning" not in readme
    assert "YouTube & AI-generated videos" not in readme


def test_active_e2e_runner_does_not_execute_deprecated_video_tests():
    runner = read_project_file("tests/run-all-tests.sh")

    assert "test-video-reel-e2e.js" not in runner
    assert "test-video-playback.js" not in runner
    assert "test-ai-video-selector.js" not in runner
    assert "test-ai-video-generation.js" not in runner
    assert "tests/e2e/web/test-quick-check.js" in runner


def test_offline_mobile_has_native_bridge_contract_instead_of_localhost_backend():
    app_mode = read_project_file("frontend/src/config/appMode.ts")
    api_service = read_project_file("frontend/src/services/api.ts")
    main_activity = read_project_file("frontend/android/app/src/main/java/it/nicco/tinderforlanguages/MainActivity.java")
    plugin = read_project_file("frontend/android/app/src/main/java/it/nicco/tinderforlanguages/OfflineBackendPlugin.java")

    assert "return 'http://localhost:8500';" not in app_mode
    assert "VITE_OFFLINE_API_URL" in app_mode
    assert "registerPlugin<OfflineBackendPlugin>('OfflineBackend')" in api_service
    assert "registerPlugin(OfflineBackendPlugin.class)" in main_activity
    assert "embedded_backend" in plugin
    assert "handle_request" in plugin


def test_developer_charts_describe_semantic_diversity_runtime_behavior():
    chart_source = read_project_file("frontend/src/components/DeveloperChartsScreen.tsx")
    chart_docs = read_project_file("docs/developer-charts.md")

    assert "Ranking ignores semanticDiversityMode" not in chart_source
    assert "Stored only: semanticDiversityMode" not in chart_source
    assert "semanticDiversityMode wide" in chart_source
    assert "round-robin semantic groups" in chart_source
    assert "Ranking ignores semanticDiversityMode" not in chart_docs


def test_database_files_are_ignored_and_not_tracked():
    gitignore = read_project_file(".gitignore")
    assert "*.db" in gitignore

    result = subprocess.run(
        ["git", "ls-files", "*.db", "backend/*.db"],
        cwd=PROJECT_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == ""
