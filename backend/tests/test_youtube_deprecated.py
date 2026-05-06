from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_APP = REPO_ROOT / "backend" / "app"
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_youtube_backend_router_is_deprecated_and_not_mounted():
    main_py = (BACKEND_APP / "main.py").read_text()

    assert "from app.routes import cards, grammar, tts, library, statistics, infographics, tracking" in main_py
    assert "include_router(videos.router)" not in main_py
    assert not (BACKEND_APP / "routes" / "videos.py").exists()
    assert (BACKEND_APP / "routes" / "deprecated" / "videos.py").exists()
    assert (BACKEND_APP / "services" / "deprecated" / "youtube.py").exists()


def test_youtube_frontend_flow_is_deprecated_and_not_loaded():
    app_tsx = (FRONTEND_SRC / "App.tsx").read_text()
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    learning_session = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()

    assert "youtube.com/iframe_api" not in app_tsx
    assert "from './VideoReel'" not in learning_screen
    assert "from './VideoSourceSelector'" not in learning_screen
    assert "from './VideoModal'" not in learning_screen
    assert "selectYouTubeVideos" not in learning_session
    assert not (FRONTEND_SRC / "components" / "VideoReel.tsx").exists()
    assert not (FRONTEND_SRC / "components" / "VideoSourceSelector.tsx").exists()
    assert (FRONTEND_SRC / "deprecated" / "youtube" / "components" / "VideoReel.tsx").exists()
    assert (FRONTEND_SRC / "deprecated" / "youtube" / "components" / "VideoSourceSelector.tsx").exists()
