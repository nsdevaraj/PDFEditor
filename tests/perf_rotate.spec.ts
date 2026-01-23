import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'large_sample.pdf');

test.describe('Performance Benchmark: Rotate PDF', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test('Measure Rotate PDF Load Duration', async ({ page }) => {
    // Navigate to Rotate PDF tool
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('Rotate PDF').click();

    // Prepare for upload
    const fileInput = page.locator('input[type="file"]');

    // Start measurement from file upload
    const startTime = Date.now();
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for the loading spinner to disappear and thumbnails to appear
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Page 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Page 50', { exact: true })).toBeVisible();

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`BENCHMARK: Rotate PDF Load took ${duration} ms`);

    // Verify thumbnails are rendered
    const images = await page.locator('img[alt^="Page"]').count();
    expect(images).toBeGreaterThan(0);
  });
});
