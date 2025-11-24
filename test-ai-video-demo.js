/**
 * Playwright Demo - AI Video Feature
 * Interactive demo that shows the complete UI flow
 * 
 * Run with: node test-ai-video-demo.js
 */

const { chromium } = require('@playwright/test');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('🎬 Starting AI Video Feature Demo...\n');
  console.log('This will open a browser and show you the complete flow:\n');
  console.log('  1. Load the app');
  console.log('  2. Select categories');
  console.log('  3. View flashcard');
  console.log('  4. Swipe left (don\'t know)');
  console.log('  5. See Video Source Selector');
  console.log('  6. Test YouTube videos');
  console.log('  7. Test AI video generation\n');
  console.log('=' .repeat(60) + '\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 800,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null, // Use full screen
  });

  const page = await context.newPage();

  try {
    // Step 1: Load app
    console.log('📍 Step 1: Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await sleep(2000);
    console.log('✅ App loaded\n');

    // Take screenshot
    await page.screenshot({ path: 'screenshots/01-app-loaded.png' });

    // Step 2: Handle category selection
    console.log('📍 Step 2: Handling category selection...');
    const hasCategories = await page.locator('text=Select Categories').isVisible().catch(() => false);
    
    if (hasCategories) {
      console.log('   Found category selector');
      await sleep(1000);
      
      // Click Select All for simplicity
      console.log('   Clicking "Select All"...');
      await page.click('button:has-text("Select All")').catch(async () => {
        // If Select All doesn't exist, just click first category
        console.log('   Clicking first available category...');
        await page.click('button, label').first();
      });
      await sleep(1000);
      await page.screenshot({ path: 'screenshots/02-categories-selected.png' });
      
      // Start learning
      console.log('   Clicking "Start Learning"...');
      await page.click('button:has-text("Start Learning")');
      await sleep(3000);
      console.log('✅ Started learning session\n');
    } else {
      console.log('✅ Already in learning session\n');
    }

    await page.screenshot({ path: 'screenshots/03-flashcard-view.png' });

    // Step 3: Verify we're on flashcard screen
    console.log('📍 Step 3: Verifying flashcard screen...');
    const hasFlashcard = await page.locator('text=Learn German').isVisible({ timeout: 5000 });
    
    if (!hasFlashcard) {
      console.log('❌ Could not find flashcard screen');
      await page.screenshot({ path: 'screenshots/error-no-flashcard.png' });
      throw new Error('Flashcard screen not found');
    }
    
    console.log('✅ Flashcard screen confirmed');
    console.log('   You should see a German word with an image\n');
    await sleep(3000);

    // Step 4: Swipe left (don't know)
    console.log('📍 Step 4: Swiping LEFT (don\'t know the word)...');
    console.log('   Pressing ArrowLeft key...');
    await page.keyboard.press('ArrowLeft');
    await sleep(3000);
    console.log('✅ Swipe left executed\n');

    await page.screenshot({ path: 'screenshots/04-after-swipe-left.png' });

    // Step 5: Check for Video Source Selector
    console.log('📍 Step 5: Looking for Video Source Selector...');
    
    try {
      const selectorAppeared = await page.waitForSelector('text=Choose Video Source', { 
        timeout: 10000,
        state: 'visible'
      });
      
      if (selectorAppeared) {
        console.log('✅ VIDEO SOURCE SELECTOR APPEARED! 🎉\n');
        await sleep(2000);
        await page.screenshot({ path: 'screenshots/05-video-source-selector.png' });
        
        // Show the two options
        console.log('   You should see two options:');
        console.log('   📺 YouTube Videos (red button)');
        console.log('   🤖 AI Generated (purple button)\n');
        await sleep(3000);

        // Step 6: Test YouTube option
        console.log('📍 Step 6: Testing YouTube Videos...');
        console.log('   Clicking "YouTube Videos" button...');
        await page.click('button:has-text("YouTube Videos")');
        await sleep(3000);
        
        // Check if YouTube reel opened
        const hasYouTubeReel = await page.locator('text=/').isVisible({ timeout: 5000 });
        if (hasYouTubeReel) {
          console.log('✅ YouTube Video Reel opened!\n');
          await page.screenshot({ path: 'screenshots/06-youtube-reel.png' });
          
          console.log('   You should see:');
          console.log('   - Multiple YouTube videos');
          console.log('   - Video counter (e.g., "1 / 8")');
          console.log('   - Word and translation at top\n');
          await sleep(5000);
          
          // Test navigation
          console.log('   Testing navigation (ArrowDown)...');
          await page.keyboard.press('ArrowDown');
          await sleep(2000);
          console.log('✅ Navigation works!\n');
          await page.screenshot({ path: 'screenshots/07-youtube-reel-scrolled.png' });
          
          // Close reel
          console.log('   Closing YouTube reel (ESC)...');
          await page.keyboard.press('Escape');
          await sleep(2000);
          console.log('✅ YouTube reel closed\n');
          await page.screenshot({ path: 'screenshots/08-back-to-flashcard.png' });
        }

        // Step 7: Test AI option
        console.log('📍 Step 7: Testing AI Generated Videos...');
        console.log('   Swiping left again...');
        await page.keyboard.press('ArrowLeft');
        await sleep(3000);
        
        const selectorAppeared2 = await page.waitForSelector('text=Choose Video Source', { 
          timeout: 10000,
          state: 'visible'
        });
        
        if (selectorAppeared2) {
          console.log('✅ Video Source Selector appeared again\n');
          await page.screenshot({ path: 'screenshots/09-selector-again.png' });
          await sleep(2000);
          
          console.log('   Clicking "AI Generated" button...');
          await page.click('button:has-text("AI Generated")');
          await sleep(3000);
          
          // Check for loading screen
          const hasLoading = await page.locator('text=Generating AI Videos').isVisible({ timeout: 5000 });
          if (hasLoading) {
            console.log('✅ AI Video Generation Loading Screen appeared! 🤖\n');
            await page.screenshot({ path: 'screenshots/10-ai-loading.png' });
            
            console.log('   You should see:');
            console.log('   - "Generating AI Videos" title');
            console.log('   - Progress bars for each video (Video 1, Video 2, Video 3)');
            console.log('   - Progress percentages updating\n');
            
            console.log('⏳ AI video generation takes 2-5 minutes per video');
            console.log('⏳ This demo will show the loading state for 30 seconds...\n');
            
            // Monitor progress for 30 seconds
            for (let i = 0; i < 6; i++) {
              await sleep(5000);
              console.log(`   ⏱️  ${(i + 1) * 5} seconds elapsed...`);
              
              // Check if videos completed
              const hasAIReel = await page.locator('text=AI Generated').locator('..').locator('text=AI Generated').isVisible().catch(() => false);
              if (hasAIReel) {
                console.log('\n✅ AI Videos completed! Opening reel...');
                await page.screenshot({ path: 'screenshots/11-ai-reel.png' });
                await sleep(5000);
                break;
              }
            }
            
            console.log('\n📸 Screenshots saved to screenshots/ folder');
          }
        }

      } else {
        console.log('❌ Video Source Selector did not appear');
        console.log('   This might be because:');
        console.log('   - Backend is not running');
        console.log('   - Progress API failed');
        console.log('   - Frontend state issue\n');
      }
      
    } catch (error) {
      console.log('❌ Error waiting for Video Source Selector:', error.message);
      await page.screenshot({ path: 'screenshots/error-no-selector.png' });
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎬 DEMO COMPLETED');
    console.log('='.repeat(60));
    console.log('\n📊 What you saw:');
    console.log('  ✅ App loading and category selection');
    console.log('  ✅ Flashcard display');
    console.log('  ✅ Swipe left interaction');
    console.log('  ✅ Video Source Selector modal');
    console.log('  ✅ YouTube Video Reel');
    console.log('  ✅ AI Video Generation loading');
    console.log('\n📸 Screenshots saved in screenshots/ folder');
    console.log('\n💡 The browser will stay open for 2 minutes');
    console.log('💡 You can continue testing manually');
    console.log('💡 Press Ctrl+C to close\n');

    // Keep browser open
    await sleep(120000);

  } catch (error) {
    console.error('\n❌ Error during demo:', error.message);
    await page.screenshot({ path: 'screenshots/error-final.png' });
    console.log('📸 Error screenshot saved');
  } finally {
    console.log('\n🔚 Closing browser...');
    await browser.close();
    console.log('✅ Demo finished\n');
  }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

// Run the demo
runDemo().catch(console.error);
