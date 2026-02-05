import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('PDF Editor', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to Editor
    await page.getByRole('button', { name: 'Edit PDF' }).click();
  });

  test('Should load and display PDF', async ({ page }) => {
    // Check if we are on Dashboard
    await expect(page.getByText('Welcome back, Alex')).toBeVisible();

    // Upload file via the hidden input in "Upload PDF" card
    // The input is hidden but associated with the label wrapper
    // We can target the input directly
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for Editor to load
    // The Editor has "Edit PDF" in top bar. We target the specific header to avoid matching sidebar.
    await expect(page.locator('.text-lg.font-bold', { hasText: 'Edit PDF' })).toBeVisible();

    // Check for canvas
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });

    // Check for tool buttons (proving UI loaded)
    await expect(page.getByTitle('Add Text')).toBeVisible();

    // Take a screenshot to verify visual state
    // await page.screenshot({ path: 'editor-loaded.png' });
  });
});
