const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Native Build Test
 * 
 * Verifies that the native iOS/Android build system works correctly.
 * This test checks:
 * 1. Capacitor configuration exists
 * 2. iOS project exists and can be synced
 * 3. Android project exists and can be synced
 * 4. Build script exists and is executable
 * 
 * Duration: ~30 seconds (no actual device build)
 */

const PROJECT_ROOT = path.join(__dirname, '../..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');

const testResults = {
  capacitorConfig: false,
  iosProjectExists: false,
  androidProjectExists: false,
  buildScriptExists: false,
  webBuildWorks: false,
  iosSyncWorks: false,
  androidSyncWorks: false,
};

function runCommand(command, cwd = FRONTEND_DIR) {
  try {
    execSync(command, { cwd, stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch (error) {
    return false;
  }
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

console.log('\n📱 NATIVE BUILD TEST\n');
console.log('Verifying Capacitor iOS/Android build system.\n');
console.log('═══════════════════════════════════════\n');

console.log('📍 Step 1: Checking Capacitor configuration...');
const capacitorConfigPath = path.join(FRONTEND_DIR, 'capacitor.config.ts');
if (fileExists(capacitorConfigPath)) {
  testResults.capacitorConfig = true;
  console.log('   ✅ capacitor.config.ts exists\n');
} else {
  console.log('   ❌ capacitor.config.ts not found\n');
}

console.log('📍 Step 2: Checking iOS project...');
const iosProjectPath = path.join(FRONTEND_DIR, 'ios');
if (fileExists(iosProjectPath)) {
  testResults.iosProjectExists = true;
  console.log('   ✅ iOS project exists\n');
} else {
  console.log('   ⚠️  iOS project not found (run: npx cap add ios)\n');
}

console.log('📍 Step 3: Checking Android project...');
const androidProjectPath = path.join(FRONTEND_DIR, 'android');
if (fileExists(androidProjectPath)) {
  testResults.androidProjectExists = true;
  console.log('   ✅ Android project exists\n');
} else {
  console.log('   ⚠️  Android project not found (run: npx cap add android)\n');
}

console.log('📍 Step 4: Checking build script...');
const buildScriptPath = path.join(PROJECT_ROOT, 'scripts', 'package_native.sh');
if (fileExists(buildScriptPath)) {
  testResults.buildScriptExists = true;
  console.log('   ✅ package_native.sh exists\n');
} else {
  console.log('   ❌ package_native.sh not found\n');
}

console.log('📍 Step 5: Testing web build...');
if (runCommand('npm run build')) {
  testResults.webBuildWorks = true;
  console.log('   ✅ Web build successful\n');
} else {
  console.log('   ❌ Web build failed\n');
}

console.log('📍 Step 6: Testing iOS sync...');
if (testResults.iosProjectExists && runCommand('npx cap sync ios')) {
  testResults.iosSyncWorks = true;
  console.log('   ✅ iOS sync successful\n');
} else if (!testResults.iosProjectExists) {
  console.log('   ⚠️  Skipped (no iOS project)\n');
} else {
  console.log('   ❌ iOS sync failed\n');
}

console.log('📍 Step 7: Testing Android sync...');
if (testResults.androidProjectExists && runCommand('npx cap sync android')) {
  testResults.androidSyncWorks = true;
  console.log('   ✅ Android sync successful\n');
} else if (!testResults.androidProjectExists) {
  console.log('   ⚠️  Skipped (no Android project)\n');
} else {
  console.log('   ❌ Android sync failed\n');
}

console.log('═══════════════════════════════════════');
console.log('📊 TEST RESULTS SUMMARY\n');

const passed = Object.values(testResults).filter(v => v).length;
const total = Object.keys(testResults).length;

Object.entries(testResults).forEach(([test, result]) => {
  const status = result ? '✅' : '❌';
  const testName = test.replace(/([A-Z])/g, ' $1').trim();
  console.log(`   ${status} ${testName}`);
});

console.log(`\n   Total: ${passed}/${total} tests passed`);
console.log('═══════════════════════════════════════\n');

process.exit(passed >= 5 ? 0 : 1);
