import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('PDF Editor Drawing Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.locator('.text-lg.font-bold', { hasText: 'Edit PDF' })).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible({ timeout: 20000 });
  });

  test('Should verify Top Bar Z-Index and drawing functionality', async ({ page }) => {
    // Check Top Bar Z-Index
    // Target the top bar: absolute top-0 left-0 right-0 h-16
    const topBar = page.locator('div.absolute.top-0.left-0.right-0.h-16').first();
    await expect(topBar).toHaveCSS('z-index', '50');

    // 1. Draw with Pencil
    const penButton = page.locator('button[title="Freehand Draw"]');
    await penButton.click();

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not found');

    const startX = box.x + 100;
    const startY = box.y + 100;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY + 100);
    await page.mouse.up();

    let paths = page.locator('div.absolute.z-20 svg path');
    await expect(paths).toHaveCount(1);

    // Verify cursor style for Eraser
    await penButton.click();

    // Check cursor on the page container
    // The containerRef div has the cursor style
    const pageContainer = page.locator('div.bg-white.shadow-2xl.transition-transform').first();
    await expect(pageContainer).toHaveCSS('cursor', 'crosshair');
  });
});
