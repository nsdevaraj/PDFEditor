import { test, expect } from '@playwright/test';

test.describe('New PDF Conversion Tools', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText('All PDF Tools')).toBeVisible();
  });

  test('Verify new tools are present', async ({ page }) => {
    await expect(page.getByText('Word to PDF')).toBeVisible();
    await expect(page.getByText('Excel to PDF')).toBeVisible();
    await expect(page.getByText('PPT to PDF')).toBeVisible();
    await expect(page.getByText('JPG to PDF')).toBeVisible();
    await expect(page.getByText('HTML to PDF')).toBeVisible();
  });

  test('HTML to PDF UI interaction', async ({ page }) => {
    await page.getByText('HTML to PDF').click();

    // Check for new UI elements
    await expect(page.getByText('Choose Input Method')).toBeVisible();
    await expect(page.getByText('Upload HTML File')).toBeVisible();
    await expect(page.getByText('Enter URL or Paste HTML')).toBeVisible();

    // Test Text Input
    const htmlContent = '<h1>Hello World</h1><p>This is a test PDF from HTML.</p>';
    await page.locator('textarea').fill(htmlContent);

    // Click Convert
    await page.getByRole('button', { name: 'Convert Content' }).click();

    // Expect success
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Download File')).toBeVisible();
  });

});
