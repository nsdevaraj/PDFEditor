import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Ensure server is up
    let retries = 5;
    while (retries > 0) {
        try {
            await page.goto('http://localhost:3000');
            break;
        } catch (e) {
            console.log('Waiting for server...');
            await new Promise(r => setTimeout(r, 2000));
            retries--;
        }
    }

    // Go to PDF to Image
    // Using simple selectors based on previous tests
    // "Convert" might be in a sidebar or menu.
    // From ToolsGrid.tsx, the tools are listed directly if we are at root?
    // App.tsx says logic.
    // Let's assume we are at root and tools are visible or we need to navigate.
    // tests/tools.spec.ts says: page.getByRole('button', { name: 'Convert' }).click();

    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('PDF to Image').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('sample.pdf');

    // Wait for "Select Output Format"
    await page.getByText('Select Output Format').waitFor();

    await page.screenshot({ path: 'verification.png' });
    console.log('Screenshot taken');
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
