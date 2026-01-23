import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('Organize PDF Verification', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test('Organize PDF loads thumbnails', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('Organize PDF').click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Should show thumbnails
    // Based on OrganizePDF code: <img alt="Page 1" ...>
    await expect(page.getByAltText('Page 1')).toBeVisible({ timeout: 10000 });

    // Check if summary updates
    await expect(page.getByText('Pages: 1')).toBeVisible(); // sample.pdf has 1 page
  });
});
