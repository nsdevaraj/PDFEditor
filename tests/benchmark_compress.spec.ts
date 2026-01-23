import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'large_sample.pdf');

async function createLargeSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Create 20 pages
  for (let i = 0; i < 20; i++) {
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const fontSize = 30;

      page.drawText(`Page ${i + 1}`, {
        x: 50,
        y: height - 4 * fontSize,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0.53, 0.71),
      });

      // Add some more text to make it slightly heavier
      for (let j = 0; j < 50; j++) {
        page.drawText(`This is line ${j} of some filler text on page ${i + 1}.`, {
            x: 50,
            y: height - (6 * fontSize) - (j * 12),
            size: 10,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
        });
      }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(SAMPLE_PDF_PATH, pdfBytes);
}

test.describe('Performance Benchmark: Compress PDF', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        console.log('Generating large sample PDF for benchmark...');
        await createLargeSamplePdf();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText('All PDF Tools')).toBeVisible();
  });

  test('Benchmark Compress PDF Time', async ({ page }) => {
    await page.getByText('Compress PDF').click();
    const fileInput = page.locator('input[type="file"]');

    // Start timing
    const startTime = Date.now();

    await fileInput.setInputFiles(SAMPLE_PDF_PATH);

    // Wait for completion
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 60000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`BENCHMARK_RESULT: Compress PDF took ${duration}ms`);
  });
});
