const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Mobile E2E Test Suite
 * 
 * Runs E2E tests on both Android and iOS platforms.
 * 
 * Usage:
 *   node tests/test-mobile-e2e.js           # Test both platforms
 *   node tests/test-mobile-e2e.js android   # Test Android only
 *   node tests/test-mobile-e2e.js ios       # Test iOS only
 * 
 * Prerequisites:
 * - Backend server running on localhost:8500
 * - For Android: Emulator running, app installed
 * - For iOS: Simulator running, app installed
 */

const args = process.argv.slice(2);
const testAndroid = args.length === 0 || args.includes('android');
const testIos = args.length === 0 || args.includes('ios');

async function runTestFile(testFile) {
    return new Promise((resolve) => {
        const testPath = path.join(__dirname, testFile);
        
        if (!fs.existsSync(testPath)) {
            console.log(`   ❌ Test file not found: ${testFile}\n`);
            resolve(false);
            return;
        }

        const child = spawn('node', [testPath], {
            stdio: 'inherit',
            cwd: path.dirname(testPath)
        });

        child.on('close', (code) => {
            resolve(code === 0);
        });

        child.on('error', (err) => {
            console.error(`   ❌ Error running test: ${err.message}\n`);
            resolve(false);
        });
    });
}

async function main() {
    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║           MOBILE E2E TEST SUITE                           ║');
    console.log('║           Tinder for Languages                            ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n');

    const results = {
        android: null,
        ios: null,
    };

    if (testAndroid) {
        console.log('┌───────────────────────────────────────────────────────────┐');
        console.log('│                    ANDROID TESTS                          │');
        console.log('└───────────────────────────────────────────────────────────┘\n');
        
        results.android = await runTestFile('android/test-android-e2e.js');
    }

    if (testIos) {
        console.log('┌───────────────────────────────────────────────────────────┐');
        console.log('│                      iOS TESTS                            │');
        console.log('└───────────────────────────────────────────────────────────┘\n');
        
        results.ios = await runTestFile('ios/test-ios-e2e.js');
    }

    console.log('\n');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                 FINAL RESULTS                             ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n');

    if (testAndroid) {
        const androidStatus = results.android ? '✅ PASSED' : '❌ FAILED';
        console.log(`   Android: ${androidStatus}`);
    }

    if (testIos) {
        const iosStatus = results.ios ? '✅ PASSED' : '❌ FAILED';
        console.log(`   iOS:     ${iosStatus}`);
    }

    console.log('\n');

    const allPassed = (!testAndroid || results.android) && (!testIos || results.ios);
    
    if (allPassed) {
        console.log('🎉 All mobile E2E tests PASSED!\n');
    } else {
        console.log('⚠️  Some tests failed. Check output above for details.\n');
    }

    console.log('Screenshots saved in: tests/screenshots/\n');

    process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
});
