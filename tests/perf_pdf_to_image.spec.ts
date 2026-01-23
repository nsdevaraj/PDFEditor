import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'large_sample.pdf');

test.describe('Performance Benchmark: PDF to Image', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test('Measure PDF to Image Duration', async ({ page }) => {
    // Navigate to PDF to Image tool
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('PDF to Image').click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for format selection
    await expect(page.getByText('Select Output Format')).toBeVisible();

    // Start measurement
    const startTime = Date.now();

    // Click Convert to JPG
    await page.getByText('Convert to JPG').click();

    // Wait for completion
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 120000 }); // Increase timeout for large file
    const endTime = Date.now();

    const duration = endTime - startTime;
    console.log(`BENCHMARK: PDF to Image took ${duration} ms`);
  });
});
