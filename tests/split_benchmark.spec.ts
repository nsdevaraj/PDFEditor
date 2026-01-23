import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const LARGE_PDF_PATH = path.join(process.cwd(), 'large_sample.pdf');

test.describe('Performance Benchmark: Split PDF Loading', () => {
  test.beforeAll(async () => {
      console.log("Generating large PDF for benchmark...");
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      for (let i = 0; i < 50; i++) {
          const page = pdfDoc.addPage();
          const { width, height } = page.getSize();
          const fontSize = 30;
          page.drawText(`Page ${i + 1}`, {
            x: 50,
            y: height - 4 * fontSize,
            size: fontSize,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(LARGE_PDF_PATH, pdfBytes);
  });

  test.afterAll(() => {
      if (fs.existsSync(LARGE_PDF_PATH)) {
          fs.unlinkSync(LARGE_PDF_PATH);
      }
  });

  test('Measure Split PDF Thumbnails Render Time', async ({ page }) => {
    test.setTimeout(120000); // Allow enough time for slow rendering

    await page.goto('/');

    // Navigate to Split PDF via ToolsGrid
    await page.getByRole('button', { name: 'Convert' }).click();
    await page.getByText('Split PDF').click();

    // Prepare for upload
    const fileInput = page.locator('input[type="file"]');

    // Start measurement
    const startTime = Date.now();
    await fileInput.setInputFiles(LARGE_PDF_PATH);

    // Wait for the loading spinner to disappear
    await expect(page.getByText('Loading document pages...')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Loading document pages...')).toBeHidden({ timeout: 60000 });

    // Also verify thumbnails are present.
    await expect(page.locator('text=Page 50')).toBeVisible();

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`BENCHMARK: Split PDF Load Time: ${duration} ms`);
  });
});
