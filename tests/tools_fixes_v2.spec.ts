import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');
const SAMPLE_IMAGE_PATH = path.join(process.cwd(), 'sample_test.png');

if (!fs.existsSync(SAMPLE_IMAGE_PATH)) {
    fs.writeFileSync(SAMPLE_IMAGE_PATH, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'));
}

test.describe('V2 Fixes Verification', () => {
    test.setTimeout(60000);

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Convert' }).click();
    });

    test('Change Text Color flow', async ({ page }) => {
        await page.getByText('Change Text Color').click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(SAMPLE_PDF_PATH);

        // Modal should appear
        await expect(page.locator('.fixed.z-50 h4')).toContainText('Change Text Color');
        await expect(page.getByText('Selected Color')).toBeVisible();

        // Click Apply
        await page.getByRole('button', { name: 'Apply Text Color' }).click();

        // Success
        await expect(page.getByText('Conversion Complete!')).toBeVisible();
    });

    test('Add Stamps flow', async ({ page }) => {
        await page.getByText('Add Stamps').click();
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(SAMPLE_PDF_PATH);

        // Modal should appear
        await expect(page.locator('.fixed.z-50 h4')).toContainText('Add Stamp');

        // Upload Image inside modal
        const stampInput = page.locator('input[accept="image/png, image/jpeg"]');
        await stampInput.setInputFiles(SAMPLE_IMAGE_PATH);

        // Click Apply
        await page.getByRole('button', { name: 'Apply Stamp' }).click();

        // Success
        await expect(page.getByText('Conversion Complete!')).toBeVisible();
    });

    test('Remove Annotations flow', async ({ page }) => {
        await page.getByText('Remove Annotations').click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(SAMPLE_PDF_PATH);
        await expect(page.getByText('Conversion Complete!')).toBeVisible();
    });

    test('Remove Blank Pages flow', async ({ page }) => {
        await page.getByText('Remove Blank Pages').click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(SAMPLE_PDF_PATH);
        await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
    });

    test('PDF to Image flow', async ({ page }) => {
        await page.getByText('PDF to Image', { exact: true }).click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(SAMPLE_PDF_PATH);

        // Modal should appear
        await expect(page.locator('.fixed.z-50 h4')).toContainText('Select Output Format');

        // Click Convert
        await page.getByRole('button', { name: 'Convert to JPG' }).click();

        // Success
        await expect(page.getByText('Conversion Complete!')).toBeVisible();
    });

    test('Merge PDF flow with multiple files', async ({ page }) => {
        await page.getByText('Merge PDF').click();
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles([SAMPLE_PDF_PATH, SAMPLE_PDF_PATH]);
        await expect(page.getByText('Conversion Complete!')).toBeVisible();
    });
});
