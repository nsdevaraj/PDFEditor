import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('Pen Tool Verification', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Edit PDF' }).click();

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for Editor to load by checking for "Edit PDF" header
    await expect(page.locator('.text-lg.font-bold', { hasText: 'Edit PDF' })).toBeVisible();
  });

  test('Should display Pen tool and toggle drawing mode', async ({ page }) => {
    // Locate the Pen tool button
    // We used title="Freehand Draw" in the plan, but we need to make sure we actually add that title.
    // If not, we can find it by the icon or class, but let's stick to title as it's accessible.
    // I will verify assuming I add title="Freehand Draw".

    const penButton = page.getByTitle('Freehand Draw');

    // Verify it exists
    await expect(penButton).toBeVisible();

    // Verify it is not initially active (no bg-blue-50)
    await expect(penButton).not.toHaveClass(/bg-blue-50/);

    // Click it
    await penButton.click();

    // Verify it becomes active (has bg-blue-50)
    await expect(penButton).toHaveClass(/bg-blue-50/);
  });
});
