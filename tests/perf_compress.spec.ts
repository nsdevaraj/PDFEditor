import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('Performance Benchmark: Compress PDF', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test('Measure Compress PDF Duration', async ({ page }) => {
    // Navigate to Compress PDF tool
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('Compress PDF').click();

    // Prepare for upload
    const fileInput = page.locator('input[type="file"]');

    // Start measurement from file upload
    const startTime = Date.now();
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for completion
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 60000 });
    const endTime = Date.now();

    const duration = endTime - startTime;
    console.log(`BENCHMARK: Compress PDF took ${duration} ms`);
  });
});
