#!/usr/bin/env bash
set -euo pipefail

# Build installable artifacts:
# - Android: assembles a Debug APK and copies it to artifacts/android/
# - iOS: archives and exports an IPA (requires Xcode, CocoaPods, proper signing; best-effort)
#
# Usage examples:
#   scripts/make_artifacts.sh android
#   scripts/make_artifacts.sh ios
#   scripts/make_artifacts.sh both
#
# Optional environment variables for iOS export:
#   DEVELOPMENT_TEAM=YOUR_TEAM_ID
#   IOS_EXPORT_METHOD=development  # or ad-hoc
#   DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
#
# Optional for Android install to a device (if adb available):
#   ANDROID_INSTALL=true

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${ROOT_DIR}/frontend"
cd "$FRONTEND_DIR"

TARGET_PLATFORM="${1:-both}"
ARTIFACTS_DIR="${ROOT_DIR}/artifacts"
mkdir -p "${ARTIFACTS_DIR}/android" "${ARTIFACTS_DIR}/ios"

# Globals for Gradle wrapper backup and restore
GRADLE_WRAPPER_PROPERTIES_FILE=""
GRADLE_WRAPPER_BACKUP_FILE=""

function log_info() {
  echo "[INFO] $*"
}

function log_warn() {
  echo "[WARN] $*" >&2
}

function has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

function build_web() {
  log_info "Building web bundle"
  npm run build
}

function ensure_capacitor_core() {
  if [[ ! -d "node_modules/@capacitor/core" ]]; then
    log_info "Installing @capacitor/core"
    npm install @capacitor/core@^6 --save
  fi
  if [[ ! -d "node_modules/@capacitor/cli" ]]; then
    log_info "Installing @capacitor/cli"
    npm install @capacitor/cli@^6 --save-dev
  fi
}

function ensure_java_17() {
  # Try to detect a Java 17 runtime
  local current_java_version=""
  if has_cmd java; then
    current_java_version="$(java -version 2>&1 | head -n1 || true)"
    if echo "$current_java_version" | grep -q '"17'; then
      if has_cmd /usr/libexec/java_home; then
        export JAVA_HOME="$((/usr/libexec/java_home -v 17) 2>/dev/null || echo "")"
      fi
      if [[ -z "${JAVA_HOME:-}" ]]; then
        # Fallback common Homebrew path
        if [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
          export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
        fi
      fi
      log_info "Java 17 detected: ${current_java_version}"
      return 0
    fi
  fi

  # Try to locate an installed Java 17 using java_home
  if has_cmd /usr/libexec/java_home; then
    local jh
    jh="$((/usr/libexec/java_home -v 17) 2>/dev/null || echo "")"
    if [[ -n "$jh" ]]; then
      export JAVA_HOME="$jh"
      log_info "Using JAVA_HOME from java_home: $JAVA_HOME"
      return 0
    fi
  fi

  # Install OpenJDK 17 with Homebrew (retry to mitigate transient 403)
  if has_cmd brew; then
    log_info "Installing OpenJDK 17 via Homebrew (this may take a moment)"
    bash -lc 'set -e; for i in {1..5}; do echo "[Attempt $i] brew install openjdk@17"; HOMEBREW_NO_AUTO_UPDATE=1 brew install openjdk@17 && exit 0 || { echo "Install failed. Retrying in 5s..."; sleep 5; }; done; exit 1'
    # Configure JAVA_HOME to the Homebrew path
    if [[ -d "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ]]; then
      export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
    elif [[ -d "/opt/homebrew/opt/openjdk@17" ]]; then
      export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
    fi
    log_info "JAVA_HOME set to $JAVA_HOME"
    return 0
  fi

  log_warn "Could not ensure Java 17. Please install Java 17 and set JAVA_HOME."
  return 1
}

function ensure_platforms_exist() {
  if [[ ! -d "node_modules/@capacitor/android" ]]; then
    log_info "Installing @capacitor/android"
    npm install @capacitor/android@^6 --save-dev
  fi
  if [[ ! -d "node_modules/@capacitor/ios" ]]; then
    log_info "Installing @capacitor/ios"
    npm install @capacitor/ios@^6 --save-dev
  fi

  if [[ ! -d "android" ]]; then
    log_info "Adding Android platform"
    npx cap add android
  fi
  if [[ ! -d "ios" ]]; then
    log_info "Adding iOS platform"
    npx cap add ios || true
  fi
}

function prepare_gradle_distribution_offline() {
  # Download the Gradle distribution via curl and point the wrapper to a local file.
  # This avoids Java SSL trust issues when downloading over HTTPS behind a VPN.
  local wrapper_dir="${FRONTEND_DIR}/android/gradle/wrapper"
  local properties_file="${wrapper_dir}/gradle-wrapper.properties"
  if [[ ! -f "$properties_file" ]]; then
    log_warn "Gradle wrapper properties not found; skipping offline Gradle preparation"
    return 0
  fi

  local distribution_url
  distribution_url="$(grep '^distributionUrl=' "$properties_file" | cut -d'=' -f2- | tr -d '\r' || true)"
  # Unescape Gradle's escaped sequence https\:// to https:// for curl
  distribution_url="$(printf '%s' "$distribution_url" | sed 's#\\://#://#g')"
  if [[ -z "$distribution_url" ]]; then
    log_warn "distributionUrl not found in gradle-wrapper.properties"
    return 0
  fi

  local distribution_file_name
  distribution_file_name="${distribution_url##*/}"
  local local_zip_path="${wrapper_dir}/${distribution_file_name}"

  if [[ ! -f "$local_zip_path" ]]; then
    log_info "Downloading Gradle distribution with curl: $distribution_file_name"
    # Retry with backoff to mitigate transient failures
    local attempt
    local curl_flags="-L --fail --retry 3 --retry-delay 2"
    if [[ "${INSECURE_CURL:-false}" == "true" ]]; then
      curl_flags="-k ${curl_flags}"
      log_warn "Using insecure curl (-k) to download Gradle distribution due to INSECURE_CURL=true"
    fi
    for attempt in 1 2 3 4 5; do
      if curl ${curl_flags} -o "$local_zip_path" "$distribution_url"; then
        break
      else
        log_warn "curl download failed (attempt $attempt). Retrying in 5s..."
        sleep 5
      fi
    done
    if [[ ! -f "$local_zip_path" ]]; then
      log_warn "Unable to download Gradle distribution. Proceeding without offline override."
      return 0
    fi
  fi

  # Backup and rewrite the distributionUrl to point to local file
  GRADLE_WRAPPER_PROPERTIES_FILE="$properties_file"
  GRADLE_WRAPPER_BACKUP_FILE="${properties_file}.bak"
  cp "$properties_file" "$GRADLE_WRAPPER_BACKUP_FILE"

  local escaped_path
  # macOS sed requires different in-place syntax
  escaped_path="file://${local_zip_path}"
  if [[ "$(uname)" == "Darwin" ]]; then
    sed -i '' "s#^distributionUrl=.*#distributionUrl=${escaped_path//#/\\#}#" "$properties_file"
  else
    sed -i "s#^distributionUrl=.*#distributionUrl=${escaped_path//#/\\#}#" "$properties_file"
  fi

  log_info "Gradle wrapper configured to use local distribution: $local_zip_path"
}

function ensure_gradle_cli() {
  if has_cmd gradle; then
    log_info "Gradle CLI already installed"
    return 0
  fi
  if has_cmd brew; then
    log_info "Installing Gradle CLI via Homebrew"
    bash -lc 'set -e; for i in {1..5}; do echo "[Attempt $i] brew install gradle"; HOMEBREW_NO_AUTO_UPDATE=1 brew install gradle && exit 0 || { echo "Install failed. Retrying in 5s..."; sleep 5; }; done; exit 1'
    return 0
  fi
  log_warn "Gradle CLI not found and Homebrew unavailable."
  return 1
}

function sync_platform_quiet() {
  local platform="$1"
  if [[ "$platform" == "android" ]]; then
    npx cap sync android
  elif [[ "$platform" == "ios" ]]; then
    if has_cmd xcodebuild && has_cmd pod; then
      DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}" npx cap sync ios || true
    else
      log_warn "Skipping iOS sync: Xcode or CocoaPods missing"
    fi
  fi
}

function make_android_apk() {
  log_info "Building Android Debug APK"
  ensure_java_17 || true
  # Prepare Gradle distribution locally to avoid SSL handshake issues
  prepare_gradle_distribution_offline || true
  pushd android >/dev/null
  JAVA_HOME="${JAVA_HOME:-}" ./gradlew assembleDebug
  local gradle_status=$?
  if [[ $gradle_status -ne 0 ]]; then
    log_warn "Gradle wrapper failed. Falling back to system Gradle CLI."
    ensure_gradle_cli || true
    JAVA_HOME="${JAVA_HOME:-}" gradle assembleDebug || log_warn "System Gradle build failed as well."
  fi
  local apk_path="app/build/outputs/apk/debug/app-debug.apk"
  if [[ -f "$apk_path" ]]; then
    popd >/dev/null
    local out_path="${ARTIFACTS_DIR}/android/app-debug.apk"
    cp "${FRONTEND_DIR}/android/$apk_path" "$out_path"
    log_info "Android APK ready: $out_path"

    if [[ "${ANDROID_INSTALL:-false}" == "true" ]] && has_cmd adb; then
      log_info "Installing APK to connected device via adb"
      adb install -r "$out_path" || log_warn "adb install failed; ensure a device is connected and authorized"
    fi
  else
    popd >/dev/null
    log_warn "APK not found at $apk_path"
    return 1
  fi
  # Restore Gradle wrapper properties if we modified them
  if [[ -n "$GRADLE_WRAPPER_BACKUP_FILE" && -f "$GRADLE_WRAPPER_BACKUP_FILE" ]]; then
    mv "$GRADLE_WRAPPER_BACKUP_FILE" "$GRADLE_WRAPPER_PROPERTIES_FILE"
    log_info "Restored gradle-wrapper.properties"
  fi
}

function make_ios_ipa() {
  if ! has_cmd xcodebuild; then
    log_warn "Xcode is not installed; skipping iOS IPA build"
    return 0
  fi
  if ! has_cmd pod; then
    log_warn "CocoaPods is not installed; skipping iOS IPA build"
    return 0
  fi

  log_info "Installing CocoaPods in ios/App if needed"
  pushd ios/App >/dev/null
  pod install
  popd >/dev/null

  local build_dir="${ROOT_DIR}/build"
  mkdir -p "$build_dir"

  local export_method="${IOS_EXPORT_METHOD:-development}"
  local team_id_line=""
  if [[ -n "${DEVELOPMENT_TEAM:-}" ]]; then
    team_id_line="<key>teamID</key><string>${DEVELOPMENT_TEAM}</string>"
  fi

  local export_plist="$build_dir/exportOptions.plist"
  cat > "$export_plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>${export_method}</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>destination</key>
	<string>export</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>compileBitcode</key>
	<false/>
	<key>manageAppVersionAndBuildNumber</key>
	<true/>
	${team_id_line}
</dict>
</plist>
EOF

  local developer_dir="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
  local archive_path="$build_dir/App.xcarchive"
  log_info "Archiving iOS app (this may require an Apple Developer session in Xcode)"
  set +e
  DEVELOPER_DIR="$developer_dir" xcodebuild \
    -workspace ios/App/App.xcworkspace \
    -scheme App \
    -configuration Release \
    -archivePath "$archive_path" \
    -destination 'generic/platform=iOS' \
    archive -allowProvisioningUpdates
  local archive_status=$?
  set -e
  if [[ $archive_status -ne 0 ]]; then
    log_warn "xcodebuild archive failed. Open the workspace in Xcode, set Signing Team, then try again."
    return 0
  fi

  log_info "Exporting IPA"
  set +e
  DEVELOPER_DIR="$developer_dir" xcodebuild -exportArchive \
    -archivePath "$archive_path" \
    -exportOptionsPlist "$export_plist" \
    -exportPath "$build_dir" \
    -destination 'generic/platform=iOS' \
    -allowProvisioningUpdates
  local export_status=$?
  set -e
  if [[ $export_status -ne 0 ]]; then
    log_warn "xcodebuild export failed. Ensure proper signing setup and Apple account in Xcode."
    return 0
  fi

  local ipa
  ipa="$(/bin/ls -1 "$build_dir"/*.ipa 2>/dev/null | head -n1 || true)"
  if [[ -n "$ipa" && -f "$ipa" ]]; then
    local out_path="${ARTIFACTS_DIR}/ios/App.ipa"
    mv "$ipa" "$out_path"
    log_info "iOS IPA ready: $out_path"
  else
    log_warn "No IPA produced. Check Xcode signing and export options."
  fi
}

# Main flow
ensure_capacitor_core
build_web
ensure_platforms_exist
sync_platform_quiet android
sync_platform_quiet ios

case "$TARGET_PLATFORM" in
  android)
    make_android_apk || true
    ;;
  ios)
    make_ios_ipa || true
    ;;
  both)
    make_android_apk || true
    make_ios_ipa || true
    ;;
  *)
    log_warn "Unknown target platform: $TARGET_PLATFORM"
    echo "Usage: $0 [android|ios|both]"
    exit 1
    ;;

esac

log_info "Done. Artifacts directory: ${ARTIFACTS_DIR}"
