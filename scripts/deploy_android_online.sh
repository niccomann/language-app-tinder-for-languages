#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Deploy Android ONLINE - Remote Backend (AWS/localhost)
# =============================================================================
# Builds the Android app that connects to a remote backend.
# Features: ALL features enabled (videos, TTS, AI, etc.)
#
# Usage:
#   scripts/deploy_android_online.sh                    # Build (localhost backend)
#   scripts/deploy_android_online.sh --run              # Build and run
#   scripts/deploy_android_online.sh --aws              # Build for AWS backend
#   scripts/deploy_android_online.sh --aws --run        # Build for AWS and run
#
# Environment:
#   VITE_API_URL - Backend URL (default: http://localhost:8500)
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"

RUN_APP=false
USE_AWS=false
API_URL="${VITE_API_URL:-http://localhost:8500}"

for arg in "$@"; do
  case $arg in
    --run) RUN_APP=true ;;
    --aws) USE_AWS=true ;;
  esac
done

if [[ "$USE_AWS" == true ]]; then
  API_URL="${AWS_API_URL:-https://api.tinderforlanguages.com}"
fi

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

setup_adb_reverse() {
  if [[ "$USE_AWS" == false ]]; then
    local adb_cmd="${ANDROID_HOME}/platform-tools/adb"
    if $adb_cmd devices | grep -q "device$"; then
      log_info "Setting up adb reverse for localhost backend..."
      $adb_cmd reverse tcp:8500 tcp:8500
    fi
  fi
}

log_info "=========================================="
log_info "  ANDROID ONLINE BUILD (Remote Backend)"
log_info "=========================================="
log_info ""
log_info "Backend: $API_URL"
log_info ""
log_info "Features enabled:"
log_info "  ✅ Flashcards"
log_info "  ✅ Progress tracking"
log_info "  ✅ Words Library"
log_info "  ✅ Grammar sentences + validation"
log_info "  ✅ YouTube videos"
log_info "  ✅ AI videos (Sora)"
log_info "  ✅ Text-to-speech"
log_info ""

setup_java
setup_android_env

cd "$FRONTEND_DIR"

log_info "Step 1: Building web app in ONLINE mode..."
VITE_APP_MODE=online VITE_API_URL="$API_URL" npm run build

log_info "Step 2: Syncing Android project..."
npx cap sync android

if [[ "$RUN_APP" == true ]]; then
  log_info "Step 3: Running on emulator..."
  
  emulator_id=$(~/Library/Android/sdk/platform-tools/adb devices 2>/dev/null | grep -E "emulator-[0-9]+" | head -1 | awk '{print $1}' || true)
  
  if [[ -n "$emulator_id" ]]; then
    setup_adb_reverse
    npx cap run android --target "$emulator_id"
  else
    log_info "No running emulator. Starting one..."
    avd_name=$(~/Library/Android/sdk/emulator/emulator -list-avds 2>/dev/null | head -1)
    if [[ -n "$avd_name" ]]; then
      nohup ~/Library/Android/sdk/emulator/emulator -avd "$avd_name" > /tmp/emulator.log 2>&1 &
      log_info "Waiting for emulator to boot..."
      sleep 30
      setup_adb_reverse
      npx cap run android
    else
      log_warn "No AVD found. Opening Android Studio..."
      npx cap open android
    fi
  fi
  
  log_success "Online Android app deployed!"
else
  log_success "Online Android build complete."
  log_info "Run with --run to deploy to emulator."
fi

if [[ "$USE_AWS" == false ]]; then
  log_info ""
  log_warn "IMPORTANT: Make sure the backend is running!"
  log_info "  cd backend && source .venv/bin/activate && python -m app.main"
fi
