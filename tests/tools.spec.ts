import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust path as tests/ is one level deep from root where sample.pdf is
const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');

test.describe('PDF Tools', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }
  });

  test.beforeEach(async ({ page }) => {
    // page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    // page.on('pageerror', exception => console.log(`BROWSER ERROR: ${exception}`));

    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    // Ensure we are on the main page
    await expect(page.getByText('All PDF Tools')).toBeVisible();
  });

  test('PDF to Word', async ({ page }) => {
    await page.getByText('PDF to Word').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Should show success state eventually
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
    // Check download button
    await expect(page.getByText('Download File')).toBeVisible();
  });

  test('PDF to Excel', async ({ page }) => {
    await page.getByText('PDF to Excel').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('PDF to PPT', async ({ page }) => {
    await page.getByText('PDF to PPT').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('PDF to Image', async ({ page }) => {
    await page.getByText('PDF to Image').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Select format and convert
    await expect(page.getByText('Select Output Format')).toBeVisible();
    await page.getByText('Convert to JPG').click();

    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('Merge PDF (Simulated)', async ({ page }) => {
    await page.getByText('Merge PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Split PDF', async ({ page }) => {
    await page.getByText('Split PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Should open SplitPDF component
    await expect(page.getByText('Split Options')).toBeVisible();
  });

  test('Compress PDF', async ({ page }) => {
    await page.getByText('Compress PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('Flatten PDF', async ({ page }) => {
    await page.getByText('Flatten PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('Protect PDF', async ({ page }) => {
    // test.skip(true, 'Skipping Protect PDF as the installed pdf-lib version does not support encryption.');

    await page.getByText('Protect PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Enter a password to encrypt your file')).toBeVisible();
    await page.getByPlaceholder('Enter password').fill('1234');

    // Listen for dialogs (alerts)
    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.dismiss();
    });

    await page.getByText('Encrypt PDF').click();

    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 10000 });
  });

  test('Unlock PDF', async ({ page }) => {
    // Since we don't have a protected PDF, we test with a regular one.
    // It should unlock immediately (as there is no password).
    await page.getByText('Unlock PDF').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Redact (Simulated)', async ({ page }) => {
    await page.getByText('Redact').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('OCR', async ({ page }) => {
    test.skip(true, 'OCR is too slow in this environment (timeouts > 2m)');
    test.setTimeout(180000);
    await page.getByText('OCR').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 120000 });
  });

  test('Validate PDF/A', async ({ page }) => {
    await page.getByText('Validate PDF/A').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

});
