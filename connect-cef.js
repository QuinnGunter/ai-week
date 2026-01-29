const { chromium } = require('playwright');

async function connectToAirtime() {
  console.log('Connecting to Airtime CEF app...\n');

  // Connect via Chrome DevTools Protocol
  const browser = await chromium.connectOverCDP('http://localhost:9222');

  // Get all available contexts and pages
  const contexts = browser.contexts();
  console.log(`Found ${contexts.length} browser context(s)\n`);

  for (const context of contexts) {
    const pages = context.pages();
    console.log(`Context has ${pages.length} page(s):`);

    for (const page of pages) {
      const title = await page.title();
      const url = page.url();
      console.log(`  - "${title}"`);
      console.log(`    URL: ${url}\n`);
    }
  }

  // Find the Screen Recorder page
  const allPages = contexts.flatMap(ctx => ctx.pages());
  const recorderPage = allPages.find(p => p.url().includes('/recorder'));

  if (recorderPage) {
    console.log('--- Screen Recorder Page Analysis ---\n');

    // Take a screenshot
    await recorderPage.screenshot({ path: 'recorder-screenshot.png' });
    console.log('Screenshot saved: recorder-screenshot.png\n');

    // Get page info
    const viewport = recorderPage.viewportSize();
    console.log(`Viewport: ${viewport?.width}x${viewport?.height}`);

    // Find interactive elements
    const buttons = await recorderPage.locator('button').all();
    console.log(`\nFound ${buttons.length} button(s):`);
    for (const btn of buttons.slice(0, 10)) { // First 10
      const text = await btn.textContent().catch(() => '');
      const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
      if (text?.trim() || ariaLabel) {
        console.log(`  - "${text?.trim() || ariaLabel}"`);
      }
    }

    // Check for native bridge
    const hasCefBridge = await recorderPage.evaluate(() => {
      return {
        hasCefQuery: typeof window.cefQuery !== 'undefined',
        hasElectron: typeof window.electron !== 'undefined',
        customBridges: Object.keys(window).filter(k =>
          k.toLowerCase().includes('native') ||
          k.toLowerCase().includes('bridge') ||
          k.toLowerCase().includes('airtime')
        )
      };
    });

    console.log('\n--- Native Bridge Detection ---');
    console.log(`CEF Query available: ${hasCefBridge.hasCefQuery}`);
    console.log(`Electron bridge: ${hasCefBridge.hasElectron}`);
    console.log(`Custom bridges found: ${hasCefBridge.customBridges.join(', ') || 'none'}`);
  }

  // Don't disconnect - keep app running
  console.log('\n✓ Connection successful! App remains running.');
  console.log('You can run more tests against http://localhost:9222');

  await browser.close();
}

connectToAirtime().catch(console.error);
