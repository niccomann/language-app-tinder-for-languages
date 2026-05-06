from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_APP = REPO_ROOT / "backend" / "app"
FRONTEND_SRC = REPO_ROOT / "frontend" / "src"


def test_ai_video_backend_router_is_deprecated_and_not_mounted():
    main_py = (BACKEND_APP / "main.py").read_text()

    assert "from app.routes import cards, grammar, tts, library, statistics, infographics, tracking" in main_py
    assert "include_router(sora.router)" not in main_py
    assert not (BACKEND_APP / "routes" / "sora.py").exists()
    assert not (BACKEND_APP / "services" / "sora.py").exists()
    assert not (BACKEND_APP / "services" / "sora_mock.py").exists()
    assert not (BACKEND_APP / "services" / "gemini_video.py").exists()
    assert (BACKEND_APP / "routes" / "deprecated" / "sora.py").exists()
    assert (BACKEND_APP / "services" / "deprecated" / "sora.py").exists()
    assert (BACKEND_APP / "services" / "deprecated" / "sora_mock.py").exists()
    assert (BACKEND_APP / "services" / "deprecated" / "gemini_video.py").exists()


def test_ai_video_frontend_flow_is_deprecated_and_not_loaded():
    learning_screen = (FRONTEND_SRC / "components" / "LearningScreen.tsx").read_text()
    learning_session = (FRONTEND_SRC / "hooks" / "useLearningSession.ts").read_text()
    app_mode = (FRONTEND_SRC / "config" / "appMode.ts").read_text()

    assert "from './AIVideoReel'" not in learning_screen
    assert "from './SoraVideoModal'" not in learning_screen
    assert "Generate AI Video" not in learning_screen
    assert "generateSoraVideo" not in learning_session
    assert "showAIReelFeed" not in learning_session
    assert "showSoraModal" not in learning_session
    assert "videoJobId" not in learning_session
    assert "aiVideos" not in app_mode

    assert not (FRONTEND_SRC / "components" / "AIVideoReel.tsx").exists()
    assert not (FRONTEND_SRC / "components" / "SoraVideoModal.tsx").exists()
    assert not (FRONTEND_SRC / "services" / "sora.ts").exists()
    assert (FRONTEND_SRC / "deprecated" / "ai-video" / "components" / "AIVideoReel.tsx").exists()
    assert (FRONTEND_SRC / "deprecated" / "ai-video" / "components" / "SoraVideoModal.tsx").exists()
    assert (FRONTEND_SRC / "deprecated" / "ai-video" / "services" / "sora.ts").exists()
