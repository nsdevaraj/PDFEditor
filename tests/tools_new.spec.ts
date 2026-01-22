import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('New PDF Tools', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText('All PDF Tools')).toBeVisible();
  });

  test('Rotate PDF', async ({ page }) => {
    await page.getByText('Rotate PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Rotation Options')).toBeVisible();
    await expect(page.getByText('Rotate All Right')).toBeVisible();
    await page.getByText('Rotate All Right').click();

    // Check save button
    await expect(page.getByRole('button', { name: 'Save PDF' })).toBeVisible();
  });

  test('Organize PDF', async ({ page }) => {
    await page.getByText('Organize PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Summary')).toBeVisible();
    await expect(page.getByText('Pages:')).toBeVisible();

    // Check save button
    await expect(page.getByRole('button', { name: 'Save PDF' })).toBeVisible();
  });

  test('Page Numbers', async ({ page }) => {
    await page.getByText('Page Numbers', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Position')).toBeVisible();

    // Check save button
    await expect(page.getByRole('button', { name: 'Apply Page Numbers' })).toBeVisible();
  });

  test('Crop PDF', async ({ page }) => {
    await page.getByText('Crop PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Crop Margins')).toBeVisible();

    // Check save button
    await expect(page.getByRole('button', { name: 'Crop PDF' })).toBeVisible();
  });

  test('Repair PDF', async ({ page }) => {
    await page.getByText('Repair PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

});
