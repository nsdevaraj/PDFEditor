import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Workflow Editor', () => {
  test('should load workflow editor and templates', async ({ page }) => {
    await page.goto('/');

    // Navigate to Workflow via Sidebar
    await page.getByRole('button', { name: 'Workflow' }).click();

    // Check if Tools tab is active (default)
    await expect(page.locator('aside').getByRole('button', { name: 'Tools' })).toBeVisible();

    // Check if tools are listed in sidebar
    await expect(page.locator('aside').getByText('Merge PDF')).toBeVisible();
    await expect(page.locator('aside').getByText('Drag to add').first()).toBeVisible();

    // Switch to Templates tab
    await page.locator('aside').getByRole('button', { name: 'Templates' }).click();

    // Check if templates are listed
    await expect(page.getByText('Merge & Compress')).toBeVisible();

    // Load a template
    await page.getByText('Merge & Compress').click();

    // Verify nodes are added to canvas
    // Wait for nodes to appear. We expect 3 nodes now (Initial + 2 from template)?
    // No, onLoadTemplate REPLACES nodes. So 2 nodes.
    await expect(page.locator('.react-flow__node')).toHaveCount(2);

    // Verify specific node labels
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Merge PDF' })).toBeVisible();
    await expect(page.locator('.react-flow__node').filter({ hasText: 'Compress PDF' })).toBeVisible();
  });

  test('should switch tabs in sidebar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Workflow' }).click();

    // Default is Tools
    await expect(page.locator('aside').getByText('Merge PDF')).toBeVisible();

    // Click Templates
    await page.locator('aside').getByRole('button', { name: 'Templates' }).click();
    await expect(page.getByText('Create a workflow and save it')).toBeVisible();

    // Click Saved
    await page.locator('aside').getByRole('button', { name: 'Saved' }).click();
    await expect(page.getByText('No saved workflows yet')).toBeVisible();
  });
});
