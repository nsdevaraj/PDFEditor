import { test, expect } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should show mobile header and hamburger menu', async ({ page }) => {
    await page.goto('/');

    // Check if mobile header is visible
    const mobileHeader = page.locator('.md\\:hidden.h-16');
    await expect(mobileHeader).toBeVisible();

    // Check if hamburger menu button is present
    const menuButton = mobileHeader.locator('button');
    await expect(menuButton).toBeVisible();

    // Click menu
    await menuButton.click();

    // Check if menu overlay is visible
    const menuOverlay = page.locator('.fixed.inset-0.z-50');
    await expect(menuOverlay).toBeVisible();

    // Scope to mobile menu
    const mobileMenu = menuOverlay.locator('nav');

    // Check navigation items
    await expect(mobileMenu.getByText('Dashboard', { exact: true })).toBeVisible();
    await expect(mobileMenu.getByText('Edit PDF', { exact: true })).toBeVisible();

    // Close menu (click close button inside menu)
    // The mobile menu has a close button (X icon) in the header part of the overlay
    const closeButton = menuOverlay.locator('button').first(); // First button is usually close button in header
    // Actually the close button is in the header div inside overlay
    // <div className="p-6 flex items-center justify-between ..."> ... <button><X/></button> </div>
    // Let's find the button with the X icon or just use index
    await menuOverlay.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();

    // Wait for animation
    await page.waitForTimeout(500);

    // Menu should be hidden (opacity-0 or not visible if pointer-events-none)
    // Check if overlay has opacity-0 class
    await expect(menuOverlay).toHaveClass(/opacity-0/);
  });

  test('should navigate via mobile menu', async ({ page }) => {
    await page.goto('/');

    // Open menu
    await page.locator('.md\\:hidden.h-16 button').click();

    // Scope to mobile menu
    const menuOverlay = page.locator('.fixed.inset-0.z-50');
    const mobileMenu = menuOverlay.locator('nav');

    // Click on 'Convert' (Tools)
    await mobileMenu.getByText('Convert', { exact: true }).click();

    // Should see "All PDF Tools" header
    await expect(page.getByRole('heading', { name: 'All PDF Tools' })).toBeVisible();

    // Header should still be visible in Tools view
    const mobileHeader = page.locator('.md\\:hidden.h-16');
    await expect(mobileHeader).toBeVisible();
  });

  test('should hide header in PDF Editor mode', async ({ page }) => {
    await page.goto('/');

    // Open menu
    await page.locator('.md\\:hidden.h-16 button').click();

    // Scope to mobile menu
    const menuOverlay = page.locator('.fixed.inset-0.z-50');
    const mobileMenu = menuOverlay.locator('nav');

    // Go to Dashboard
    await mobileMenu.getByText('Dashboard', { exact: true }).click();

    // Create a dummy PDF file
    const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF');

    // Trigger upload
    const fileInput = page.locator('input[type="file"][accept="application/pdf"]');
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: buffer
    });

    // Expect PDF Editor to open
    // PDF Editor has "Export" button
    await expect(page.getByText('Export')).toBeVisible();

    // Check if mobile header is HIDDEN
    const mobileHeader = page.locator('.md\\:hidden.h-16');
    await expect(mobileHeader).toBeHidden();
  });
});
