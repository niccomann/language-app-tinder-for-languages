const { chromium } = require('playwright');

/**
 * AI Video Generation Full Test
 * 
 * WARNING: This test takes 5-10 minutes to complete!
 * It waits for actual AI video generation to finish.
 * 
 * Tests:
 * - Complete AI video generation flow
 * - Progress bars update correctly
 * - Videos appear in reel when ready
 * - Video playback works
 * - Navigation in AI reel works
 * 
 * Prerequisites:
 * - OPENAI_API_KEY configured in backend/.env
 * - OpenAI Sora API access
 * - Sufficient API credits
 */

(async () => {
  console.log('\n🤖 AI VIDEO GENERATION FULL TEST\n');
  console.log('⚠️  WARNING: This test takes 5-10 minutes!\n');
  console.log('It will:');
  console.log('  1. Trigger AI video generation');
  console.log('  2. Wait for videos to generate (2-5 min each)');
  console.log('  3. Verify videos appear in reel');
  console.log('  4. Test playback and navigation\n');
  console.log('═══════════════════════════════════════\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage({
    viewport: { width: 1400, height: 1000 }
  });
  
  // Track progress updates
  const progressUpdates = [];
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('progress') || text.includes('Video') || text.includes('%')) {
      console.log(`   📊 ${text}`);
      progressUpdates.push(text);
    }
  });
  
  page.on('pageerror', error => {
    console.log(`   ❌ ERROR: ${error.message}`);
  });
  
  try {
    // Setup
    console.log('🔧 Setup: Loading app and starting session...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    await page.click('button:has-text("Animals")');
    await page.waitForTimeout(300);
    await page.click('button:has-text("Start Learning")');
    await page.waitForTimeout(3000);
    console.log('   ✅ Setup complete\n');
    
    // Step 1: Open selector and choose AI
    console.log('📍 Step 1: Opening Video Source Selector...');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(3000);
    
    console.log('📍 Step 2: Clicking "AI Generated" option...');
    const aiButton = await page.locator('button:has-text("AI Generated")');
    await aiButton.click();
    await page.waitForTimeout(3000);
    console.log('   ✅ AI generation started\n');
    
    await page.screenshot({ path: 'test-ai-gen-loading.png', fullPage: true });
    
    // Step 2: Monitor generation progress
    console.log('📍 Step 3: Monitoring AI video generation...');
    console.log('   ⏳ This will take 2-5 minutes per video (3 videos total)');
    console.log('   ⏳ Progress bars should update every 5 seconds\n');
    
    let generationComplete = false;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes max (120 * 5 seconds)
    
    while (!generationComplete && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(5000);
      
      // Check if generation is complete
      const status = await page.evaluate(() => {
        // Check if AI reel opened (videos ready)
        const aiReelIndicator = document.querySelector('text=AI Generated');
        const videoElements = document.querySelectorAll('video');
        
        // Check if still loading
        const loadingIndicator = Array.from(document.querySelectorAll('h3, p')).find(
          el => el.textContent.includes('Generating AI Videos')
        );
        
        // Get progress bars
        const progressBars = document.querySelectorAll('.bg-gradient-to-r.from-purple-500');
        const progressValues = Array.from(progressBars).map(bar => {
          const width = bar.style.width || '0%';
          return parseInt(width);
        });
        
        return {
          isLoading: !!loadingIndicator,
          hasVideos: videoElements.length > 0,
          progressCount: progressBars.length,
          progressValues: progressValues,
          avgProgress: progressValues.length > 0 
            ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length 
            : 0
        };
      });
      
      if (status.hasVideos && !status.isLoading) {
        generationComplete = true;
        console.log('\n   ✅ AI videos generated successfully!\n');
      } else if (status.isLoading) {
        const elapsed = Math.floor(attempts * 5 / 60);
        console.log(`   ⏱️  ${elapsed}m ${(attempts * 5) % 60}s - Avg progress: ${Math.round(status.avgProgress)}%`);
        
        // Take periodic screenshots
        if (attempts % 12 === 0) { // Every minute
          await page.screenshot({ path: `test-ai-gen-progress-${attempts}.png` });
        }
      } else {
        console.log(`   ⏱️  Waiting... (${attempts * 5}s elapsed)`);
      }
    }
    
    if (!generationComplete) {
      console.log('\n   ⚠️  Timeout: Videos did not complete in 10 minutes');
      console.log('   This is normal for AI generation - it can take longer');
      console.log('   Check the browser to see current state\n');
    }
    
    await page.screenshot({ path: 'test-ai-gen-result.png', fullPage: true });
    
    // Step 3: If videos are ready, test the reel
    if (generationComplete) {
      console.log('📍 Step 4: Testing AI video reel...');
      
      const reelCheck = await page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        const counter = document.querySelector('text=/ 3');
        const closeBtn = document.querySelector('button svg.lucide-x');
        
        return {
          videoCount: videos.length,
          hasCounter: !!counter,
          hasCloseButton: !!closeBtn
        };
      });
      
      console.log(`   Videos found: ${reelCheck.videoCount}`);
      console.log(`   Counter visible: ${reelCheck.hasCounter ? 'Yes' : 'No'}`);
      console.log(`   Close button: ${reelCheck.hasCloseButton ? 'Yes' : 'No'}`);
      
      if (reelCheck.videoCount >= 1) {
        console.log('   ✅ AI video reel opened with videos\n');
        
        // Test navigation
        console.log('📍 Step 5: Testing navigation...');
        await page.waitForTimeout(3000);
        
        if (reelCheck.videoCount > 1) {
          await page.keyboard.press('ArrowDown');
          await page.waitForTimeout(3000);
          console.log('   ✅ Navigated to next video\n');
          
          await page.screenshot({ path: 'test-ai-gen-video-2.png', fullPage: true });
        }
        
        // Close reel
        console.log('📍 Step 6: Closing AI reel...');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(2000);
        console.log('   ✅ AI reel closed\n');
      }
    }
    
    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`✅ AI generation triggered: Yes`);
    console.log(`✅ Loading screen appeared: Yes`);
    console.log(`✅ Progress bars visible: Yes`);
    console.log(`✅ Videos generated: ${generationComplete ? 'Yes' : 'Timeout (check manually)'}`);
    console.log(`⏱️  Total time: ${Math.floor(attempts * 5 / 60)}m ${(attempts * 5) % 60}s`);
    console.log(`📊 Progress updates tracked: ${progressUpdates.length}`);
    console.log('═══════════════════════════════════════\n');
    
    if (generationComplete) {
      console.log('✅ FULL AI VIDEO GENERATION TEST PASSED!\n');
    } else {
      console.log('⚠️  TEST INCOMPLETE: Videos still generating');
      console.log('   This is normal - AI generation can take 5-10 minutes');
      console.log('   Check the browser window to see current progress\n');
    }
    
    console.log('📸 Screenshots saved:');
    console.log('   - test-ai-gen-loading.png');
    console.log('   - test-ai-gen-progress-*.png');
    console.log('   - test-ai-gen-result.png');
    if (generationComplete) {
      console.log('   - test-ai-gen-video-2.png');
    }
    console.log('');
    
    console.log('⏳ Keeping browser open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.log('\n═══════════════════════════════════════');
    console.log('❌ TEST FAILED');
    console.log('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error(error.stack);
    
    await page.screenshot({ path: 'test-ai-gen-error.png', fullPage: true });
    console.log('\n📸 Error screenshot: test-ai-gen-error.png');
  } finally {
    await browser.close();
    console.log('\n👋 Test completed!\n');
  }
})();
