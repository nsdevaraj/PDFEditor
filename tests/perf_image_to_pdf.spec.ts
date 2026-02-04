import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_IMAGE_PATH = path.join(process.cwd(), 'large_sample.jpg');

test.describe('Performance Benchmark: JPG to PDF', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
        throw new Error(`Sample Image not found at ${SAMPLE_IMAGE_PATH}`);
    }
  });

  test('Measure JPG to PDF Duration', async ({ page }) => {
    // Navigate to JPG to PDF tool
    await page.goto('/');

    // Check if we are on desktop or mobile layout and navigate accordingly
    // The previous tests used page.getByRole('button', { name: 'Convert' })
    // which seemed to work.

    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('JPG to PDF').click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_IMAGE_PATH);

    // It should automatically start processing or ask for format?
    // Based on ToolsGrid.tsx:
    // if (activeTool.title === "JPG to PDF") {
    //     ...
    //     setStatus('success');
    // }
    // It seems "JPG to PDF" just runs immediately without further configuration.

    // Start measurement (from file upload which triggers the process)
    const startTime = Date.now();

    // Wait for completion
    // The UI shows "Conversion Complete!" on success
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 120000 });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`BENCHMARK: JPG to PDF took ${duration} ms`);
  });
});
