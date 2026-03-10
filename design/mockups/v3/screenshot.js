const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function captureScreenshots() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox']
  });
  
  const mockupsDir = __dirname;
  const htmlFiles = fs.readdirSync(mockupsDir)
    .filter(f => f.endsWith('.html'))
    .sort();
  
  console.log(`Found ${htmlFiles.length} HTML files to screenshot`);
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(mockupsDir, htmlFile);
    const pngPath = filePath.replace('.html', '.png');
    
    console.log(`Capturing: ${htmlFile}`);
    
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 }
    });
    
    await page.goto(`file://${filePath}`);
    await page.waitForTimeout(1000); // Wait for icons to load
    
    await page.screenshot({ 
      path: pngPath,
      fullPage: false
    });
    
    console.log(`  -> ${path.basename(pngPath)}`);
    await page.close();
  }
  
  await browser.close();
  console.log('Done!');
}

captureScreenshots().catch(console.error);
