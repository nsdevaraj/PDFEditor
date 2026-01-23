import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'large_sample.pdf');

test.describe('Performance Tests', () => {
    test.beforeAll(() => {
        // Generate large PDF if not exists
        if (!fs.existsSync(SAMPLE_PDF_PATH)) {
            console.log('Generating large PDF for testing...');
            try {
                execSync('node tests/setup_pdfs.js');
            } catch (e) {
                console.error('Failed to generate PDF:', e);
                throw e;
            }
        }
    });

    test('Measure Flatten PDF Performance', async ({ page }) => {
      test.setTimeout(120000); // Allow enough time

      await page.goto('/');
      await page.getByRole('button', { name: 'Convert' }).click();
      await page.getByText('Flatten PDF').click();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(SAMPLE_PDF_PATH);

      const startTime = Date.now();

      // Wait for success message
      await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 60000 });

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Flatten PDF Duration: ${duration} ms`);
    });
});
