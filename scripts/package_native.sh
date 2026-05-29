#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Package Native Script - Tinder for Languages
# =============================================================================
# Converts the React web app into native iOS/Android apps using Capacitor.
#
# VERIFIED WORKING COMMANDS (Dec 25, 2025):
#   - npm install with --legacy-peer-deps (required for react-simple-maps)
#   - npx cap sync ios
#   - npx cap run ios --target <SIMULATOR_ID>
#   - xcrun simctl boot "iPhone 16"
#   - open -a Simulator
#
# Usage:
#   scripts/package_native.sh ios           # Build and sync iOS
#   scripts/package_native.sh ios --run     # Build, sync and run on simulator
#   scripts/package_native.sh android       # Build and sync Android
#   scripts/package_native.sh android --run # Build, sync and run on emulator
#   scripts/package_native.sh both          # Build and sync both platforms
#
# Prerequisites:
#   - iOS: Xcode, CocoaPods, iOS Simulator runtime
#   - Android: Android Studio, Java 17
# =============================================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
cd "$FRONTEND_DIR"

TARGET_PLATFORM="${1:-ios}"
RUN_APP=false
if [[ "${2:-}" == "--run" ]]; then
  RUN_APP=true
fi

log_info() { echo "[INFO] $*"; }
log_warn() { echo "[WARN] $*" >&2; }
log_success() { echo "[SUCCESS] $*"; }

package_exists() {
  [[ -d "node_modules/$1" ]]
}

npm_install_with_retry() {
  local package="$1"
  local save_flag="${2:---save}"
  log_info "Installing $package..."
  for attempt in {1..5}; do
    if npm install "$package" "$save_flag" --legacy-peer-deps 2>/dev/null; then
      return 0
    fi
    log_warn "Attempt $attempt failed. Retrying in 2s..."
    sleep 2
  done
  log_warn "Failed to install $package after 5 attempts"
  return 1
}

ensure_capacitor() {
  log_info "Checking Capacitor dependencies..."
  package_exists "@capacitor/core" || npm_install_with_retry "@capacitor/core@^6" "--save"
  package_exists "@capacitor/cli" || npm_install_with_retry "@capacitor/cli@^6" "--save-dev"
}

ensure_ios_platform() {
  package_exists "@capacitor/ios" || npm_install_with_retry "@capacitor/ios@^6" "--save-dev"
  [[ -d "ios" ]] || npx cap add ios
}

ensure_android_platform() {
  package_exists "@capacitor/android" || npm_install_with_retry "@capacitor/android@^6" "--save-dev"
  [[ -d "android" ]] || npx cap add android
}

ensure_ios_simulator() {
  local available_devices
  available_devices=$(xcrun simctl list devices available 2>/dev/null | grep -E "iPhone|iPad" || true)
  
  if [[ -z "$available_devices" ]]; then
    log_info "No iOS simulators found. Downloading iOS runtime..."
    xcodebuild -downloadPlatform iOS
  fi
}

get_first_iphone_id() {
  xcrun simctl list devices available 2>/dev/null | grep "iPhone" | head -1 | grep -oE '[A-F0-9-]{36}' || true
}

build_and_run_ios() {
  log_info "Building web app for mobile..."
  npm run build:mobile
  
  log_info "Ensuring iOS platform..."
  ensure_ios_platform
  
  log_info "Syncing iOS..."
  npx cap sync ios
  
  if [[ "$RUN_APP" == true ]]; then
    ensure_ios_simulator
    
    local simulator_id
    simulator_id=$(get_first_iphone_id)
    
    if [[ -n "$simulator_id" ]]; then
      log_info "Booting simulator..."
      xcrun simctl boot "$simulator_id" 2>/dev/null || true
      open -a Simulator
      
      log_info "Building and running app on simulator..."
      npx cap run ios --target "$simulator_id"
      log_success "App is running on iOS simulator!"
    else
      log_warn "No iPhone simulator found. Opening Xcode instead..."
      npx cap open ios
    fi
  else
    log_success "iOS build complete. Run with --run to launch on simulator."
  fi
}

setup_java() {
  if [[ -d "/opt/homebrew/opt/openjdk@17" ]]; then
    export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
    export PATH=$JAVA_HOME/bin:$PATH
    log_info "Using Java 17 from Homebrew"
  fi
}

setup_android_env() {
  export ANDROID_HOME=~/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
}

setup_adb_reverse() {
  if command -v adb >/dev/null 2>&1 || [[ -x "$ANDROID_HOME/platform-tools/adb" ]]; then
    local adb_cmd="${ANDROID_HOME}/platform-tools/adb"
    if $adb_cmd devices | grep -q "device$"; then
      log_info "Setting up adb reverse for backend connection..."
      $adb_cmd reverse tcp:8500 tcp:8500
      log_success "Port forwarding enabled: localhost:8500 -> emulator"
    fi
  fi
}

get_first_emulator_id() {
  local adb_cmd="${ANDROID_HOME}/platform-tools/adb"
  $adb_cmd devices 2>/dev/null | grep -E "emulator-[0-9]+" | head -1 | awk '{print $1}' || true
}

build_and_run_android() {
  setup_java
  setup_android_env
  
  log_info "Building web app for mobile..."
  npm run build:mobile
  
  log_info "Ensuring Android platform..."
  ensure_android_platform
  
  log_info "Syncing Android..."
  npx cap sync android
  
  if [[ "$RUN_APP" == true ]]; then
    local emulator_id
    emulator_id=$(get_first_emulator_id)
    
    if [[ -n "$emulator_id" ]]; then
      setup_adb_reverse
      log_info "Building and running app on emulator $emulator_id..."
      npx cap run android --target "$emulator_id"
    else
      log_info "No running emulator found. Starting one..."
      local avd_name
      avd_name=$($ANDROID_HOME/emulator/emulator -list-avds 2>/dev/null | head -1)
      if [[ -n "$avd_name" ]]; then
        nohup $ANDROID_HOME/emulator/emulator -avd "$avd_name" > /tmp/emulator.log 2>&1 &
        log_info "Waiting for emulator to boot..."
        sleep 30
        setup_adb_reverse
        npx cap run android
      else
        log_warn "No AVD found. Please create one in Android Studio."
        npx cap open android
      fi
    fi
    log_success "App is running on Android!"
  else
    log_success "Android build complete. Run with --run to launch on emulator."
  fi
}

# Main
ensure_capacitor

case "$TARGET_PLATFORM" in
  ios)
    build_and_run_ios
    ;;
  android)
    build_and_run_android
    ;;
  both)
    build_and_run_ios
    build_and_run_android
    ;;
  *)
    echo "Usage: $0 [ios|android|both] [--run]"
    exit 1
    ;;
esac

log_info "Done."
