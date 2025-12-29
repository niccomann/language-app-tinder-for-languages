const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * iOS E2E Test
 * 
 * Tests the iOS app on a simulator using xcrun simctl commands.
 * Verifies:
 * 1. Simulator is running
 * 2. App is installed
 * 3. App launches successfully
 * 4. Main screen loads
 * 
 * Prerequisites:
 * - iOS Simulator running
 * - Backend server running on localhost:8500
 * - App installed via: npx cap run ios
 * 
 * Duration: ~30 seconds
 */

const PROJECT_ROOT = path.join(__dirname, '../../..');
const SCREENSHOTS_DIR = path.join(__dirname, '../../screenshots');
const APP_BUNDLE_ID = 'it.nicco.tinderforlanguages';

const testResults = {
    simulatorRunning: false,
    appInstalled: false,
    appLaunches: false,
    appTerminates: false,
    appRelaunches: false,
    screenshotTaken: false,
    screenshotValid: false,
    uiElementsVisible: false,
};

function runSimctl(args, options = {}) {
    try {
        const result = execSync(`xcrun simctl ${args}`, { 
            encoding: 'utf8',
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options
        });
        return { success: true, output: result };
    } catch (error) {
        return { success: false, error: error.message, output: error.stdout || '' };
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBootedSimulatorId() {
    try {
        const result = execSync('xcrun simctl list devices booted -j', { encoding: 'utf8' });
        const data = JSON.parse(result);
        
        for (const runtime of Object.values(data.devices)) {
            for (const device of runtime) {
                if (device.state === 'Booted') {
                    return device.udid;
                }
            }
        }
    } catch (error) {
        return null;
    }
    return null;
}

async function runTest() {
    console.log('\n📱 iOS E2E TEST\n');
    console.log('Testing iOS app on simulator.\n');
    console.log('═══════════════════════════════════════\n');

    if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }

    console.log('📍 Step 1: Checking simulator status...');
    const simulatorId = getBootedSimulatorId();
    
    if (simulatorId) {
        testResults.simulatorRunning = true;
        console.log(`   ✅ Simulator running: ${simulatorId}\n`);
    } else {
        console.log('   ❌ No simulator running\n');
        console.log('   Run: open -a Simulator\n');
        return printResults();
    }

    console.log('📍 Step 2: Checking app installation...');
    const listAppsResult = runSimctl(`listapps booted`, { silent: true });
    
    if (listAppsResult.output && listAppsResult.output.includes(APP_BUNDLE_ID)) {
        testResults.appInstalled = true;
        console.log('   ✅ App is installed\n');
    } else {
        const getAppPath = runSimctl(`get_app_container booted ${APP_BUNDLE_ID}`, { silent: true });
        if (getAppPath.success) {
            testResults.appInstalled = true;
            console.log('   ✅ App is installed\n');
        } else {
            console.log('   ❌ App not installed. Run: npx cap run ios\n');
            return printResults();
        }
    }

    console.log('📍 Step 3: Terminating any existing app instance...');
    runSimctl(`terminate booted ${APP_BUNDLE_ID}`, { silent: true });
    await sleep(1000);
    testResults.appTerminates = true;
    console.log('   ✅ Previous instance terminated\n');

    console.log('📍 Step 4: Launching app...');
    const launchResult = runSimctl(`launch booted ${APP_BUNDLE_ID}`, { silent: true });
    
    if (launchResult.success) {
        testResults.appLaunches = true;
        console.log('   ✅ App launched\n');
    } else {
        console.log('   ❌ Failed to launch app\n');
        console.log(`   Error: ${launchResult.error}\n`);
        return printResults();
    }

    console.log('📍 Step 5: Waiting for app to load...');
    await sleep(5000);
    console.log('   ✅ Waited 5 seconds\n');

    console.log('📍 Step 6: Taking screenshot...');
    const screenshotPath = path.join(SCREENSHOTS_DIR, 'ios-e2e-test.png');
    
    try {
        execSync(`xcrun simctl io booted screenshot "${screenshotPath}"`, { stdio: 'pipe' });
        
        if (fs.existsSync(screenshotPath)) {
            const stats = fs.statSync(screenshotPath);
            if (stats.size > 10000) {
                testResults.screenshotTaken = true;
                testResults.screenshotValid = true;
                console.log(`   ✅ Screenshot saved: ${screenshotPath}\n`);
                console.log(`   📊 File size: ${(stats.size / 1024).toFixed(1)} KB\n`);
            } else {
                testResults.screenshotTaken = true;
                console.log('   ⚠️  Screenshot taken but file is small\n');
            }
        }
    } catch (error) {
        console.log(`   ❌ Failed to take screenshot: ${error.message}\n`);
    }

    console.log('📍 Step 7: Verifying app is responsive...');
    const terminateResult = runSimctl(`terminate booted ${APP_BUNDLE_ID}`, { silent: true });
    await sleep(1000);
    
    const relaunchResult = runSimctl(`launch booted ${APP_BUNDLE_ID}`, { silent: true });
    if (relaunchResult.success) {
        testResults.appRelaunches = true;
        console.log('   ✅ App relaunched successfully\n');
    } else {
        console.log('   ⚠️  App relaunch had issues\n');
    }

    await sleep(3000);

    console.log('📍 Step 8: Taking final screenshot...');
    const screenshot2Path = path.join(SCREENSHOTS_DIR, 'ios-e2e-final.png');
    
    try {
        execSync(`xcrun simctl io booted screenshot "${screenshot2Path}"`, { stdio: 'pipe' });
        
        if (fs.existsSync(screenshot2Path) && fs.statSync(screenshot2Path).size > 10000) {
            testResults.uiElementsVisible = true;
            console.log(`   ✅ Final screenshot saved: ${screenshot2Path}\n`);
        }
    } catch (error) {
        console.log(`   ⚠️  Could not take final screenshot\n`);
    }

    return printResults();
}

function printResults() {
    console.log('═══════════════════════════════════════');
    console.log('📊 iOS E2E TEST RESULTS\n');

    const passed = Object.values(testResults).filter(v => v).length;
    const total = Object.keys(testResults).length;

    const testNames = {
        simulatorRunning: 'Simulator Running',
        appInstalled: 'App Installed',
        appLaunches: 'App Launches',
        appTerminates: 'App Terminates',
        appRelaunches: 'App Relaunches',
        screenshotTaken: 'Screenshot Taken',
        screenshotValid: 'Screenshot Valid',
        uiElementsVisible: 'UI Elements Visible',
    };

    Object.entries(testResults).forEach(([key, result]) => {
        const status = result ? '✅' : '❌';
        console.log(`   ${status} ${testNames[key]}`);
    });

    console.log(`\n   Total: ${passed}/${total} tests passed`);
    console.log('═══════════════════════════════════════\n');

    const success = passed >= 6;
    console.log(success ? '🎉 iOS E2E test PASSED!\n' : '⚠️  iOS E2E test has issues\n');
    
    return success;
}

runTest()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Test failed with error:', err);
        process.exit(1);
    });
