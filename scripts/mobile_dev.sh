#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
JAVA_HOME_DEFAULT="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
EMULATOR_AVD="${EMULATOR_AVD:-mobile_test}"
IOS_SIMULATOR="${IOS_SIMULATOR:-iPhone 16}"

log() { echo "[$(date +%H:%M:%S)] $*"; }

export ANDROID_HOME
export JAVA_HOME="${JAVA_HOME:-$JAVA_HOME_DEFAULT}"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

build_web() {
  cd "$FRONTEND_DIR"
  log "Building web bundle (mode=mobile)..."
  npm run build:mobile
  log "Syncing Capacitor..."
  npx cap sync
}

run_android() {
  build_web
  cd "$FRONTEND_DIR/android"
  log "Building debug APK..."
  ./gradlew assembleDebug -q

  if ! adb devices | grep -qE "emulator-.*device$"; then
    log "No running emulator. Booting $EMULATOR_AVD..."
    nohup emulator -avd "$EMULATOR_AVD" -no-snapshot -no-boot-anim -no-audio > /tmp/emulator.log 2>&1 &
    log "Waiting for boot..."
    until adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do sleep 4; done
    log "Boot complete."
  fi

  log "Installing APK..."
  adb install -r "$FRONTEND_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
  log "Launching app..."
  adb shell am start -n it.nicco.tinderforlanguages/.MainActivity
  log "Done. Tail logs with:"
  log "  adb logcat | grep -E 'Capacitor|chromium'"
}

run_ios() {
  build_web
  cd "$FRONTEND_DIR"
  log "Looking for iPhone Simulator..."
  local sim_id
  sim_id=$(xcrun simctl list devices available 2>/dev/null | grep "$IOS_SIMULATOR" | head -1 | grep -oE '[A-F0-9-]{36}' || true)
  if [[ -z "$sim_id" ]]; then
    log "No '$IOS_SIMULATOR' simulator available. Downloading iOS runtime..."
    xcodebuild -downloadPlatform iOS
    sim_id=$(xcrun simctl list devices available 2>/dev/null | grep "$IOS_SIMULATOR" | head -1 | grep -oE '[A-F0-9-]{36}')
  fi
  log "Booting simulator $sim_id..."
  xcrun simctl boot "$sim_id" 2>/dev/null || true
  open -a Simulator
  log "Building and running iOS app..."
  npx cap run ios --target "$sim_id"
}

case "${1:-android}" in
  android) run_android ;;
  ios) run_ios ;;
  build-only) build_web ;;
  *) echo "Usage: $0 [android|ios|build-only]"; exit 1 ;;
esac
