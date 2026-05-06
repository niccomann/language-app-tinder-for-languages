#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Deploy Android OFFLINE - Embedded Python Backend
# =============================================================================
# Builds the Android app with embedded Python backend (Chaquopy).
# Features: Flashcards, Progress, Library, Grammar (no videos, no TTS)
#
# Usage:
#   scripts/deploy_android_offline.sh          # Build only
#   scripts/deploy_android_offline.sh --run    # Build and run on emulator
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
MOBILE_BACKEND_DIR="${ROOT_DIR}/mobile-backend"
ANDROID_PYTHON_DIR="${FRONTEND_DIR}/android/app/src/main/python"

RUN_APP=false
[[ "${1:-}" == "--run" ]] && RUN_APP=true

log_info() { echo "[INFO] $*"; }
log_success() { echo "[SUCCESS] $*"; }
log_warn() { echo "[WARN] $*" >&2; }

setup_java() {
  if [[ -d "/opt/homebrew/opt/openjdk@17" ]]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
    export PATH=$JAVA_HOME/bin:$PATH
  fi
}

setup_android_env() {
  export ANDROID_HOME=~/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
}

log_info "=========================================="
log_info "  ANDROID OFFLINE BUILD (Embedded Python)"
log_info "=========================================="
log_info ""
log_info "Features enabled:"
log_info "  ✅ Flashcards"
log_info "  ✅ Progress tracking"
log_info "  ✅ Words Library"
log_info "  ✅ Grammar sentences"
log_info "  ❌ YouTube videos (deprecated)"
log_info "  ❌ AI videos (deprecated)"
log_info "  ❌ Text-to-speech (requires OpenAI)"
log_info ""

setup_java
setup_android_env

cd "$FRONTEND_DIR"

log_info "Step 1: Building web app in OFFLINE mode..."
VITE_APP_MODE=offline npm run build

log_info "Step 2: Copying embedded Python backend..."
mkdir -p "$ANDROID_PYTHON_DIR"
cp "$MOBILE_BACKEND_DIR/embedded_backend.py" "$ANDROID_PYTHON_DIR/"

log_info "Step 3: Syncing Android project..."
npx cap sync android

if [[ "$RUN_APP" == true ]]; then
  log_info "Step 4: Running on emulator..."
  
  emulator_id=$(~/Library/Android/sdk/platform-tools/adb devices 2>/dev/null | grep -E "emulator-[0-9]+" | head -1 | awk '{print $1}' || true)
  
  if [[ -n "$emulator_id" ]]; then
    npx cap run android --target "$emulator_id"
  else
    log_info "No running emulator. Starting one..."
    avd_name=$(~/Library/Android/sdk/emulator/emulator -list-avds 2>/dev/null | head -1)
    if [[ -n "$avd_name" ]]; then
      nohup ~/Library/Android/sdk/emulator/emulator -avd "$avd_name" > /tmp/emulator.log 2>&1 &
      sleep 30
      npx cap run android
    else
      log_warn "No AVD found. Opening Android Studio..."
      npx cap open android
    fi
  fi
  
  log_success "Offline Android app deployed!"
else
  log_success "Offline Android build complete."
  log_info "Run with --run to deploy to emulator."
fi

log_info ""
log_info "NOTE: This build does NOT require a backend server."
log_info "All data is stored locally on the device."
