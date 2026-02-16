import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import pptxgen from 'pptxgenjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAMPLE_PDF_PATH = path.join(process.cwd(), 'sample.pdf');
const SAMPLE_JPG_PATH = path.join(process.cwd(), 'sample_test.jpg');
const SAMPLE_PNG_PATH = path.join(process.cwd(), 'sample_test.png');
const SAMPLE_WEBP_PATH = path.join(process.cwd(), 'sample_test.webp');
const SAMPLE_BMP_PATH = path.join(process.cwd(), 'sample_test.bmp');
const SAMPLE_TIFF_PATH = path.join(process.cwd(), 'sample_test.tiff');
const SAMPLE_TXT_PATH = path.join(process.cwd(), 'sample_test.txt');
const SAMPLE_MD_PATH = path.join(process.cwd(), 'sample_test.md');
const SAMPLE_DOCX_PATH = path.join(process.cwd(), 'sample_test.docx');
const SAMPLE_XLSX_PATH = path.join(process.cwd(), 'sample_test.xlsx');
const SAMPLE_PPTX_PATH = path.join(process.cwd(), 'sample_test.pptx');

// Minimal valid file contents (Base64) - 1x1 pixels
const JPG_B64 = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
const PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const WEBP_B64 = 'UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';
const BMP_B64 = 'Qk06AAAAAAAAADYAAAAoAAAAAQAAAAEAAAABABgAAAAAAAQAAADEDgAAxA4AAAAAAAAAAAAA/wAAAAD/AAAA';
const TIFF_B64 = 'TU0AKgAAAAgAAwEAAAMAAAABAAEAAAEBAAMAAAABAAEAAAIBAAABAAAAAQAAAAOwAAABAAAAAQAAAA==';

const ensureTestFiles = async () => {
    if (!fs.existsSync(SAMPLE_PDF_PATH)) {
        throw new Error(`Sample PDF not found at ${SAMPLE_PDF_PATH}`);
    }

    // Create dummy image and text files
    if (!fs.existsSync(SAMPLE_JPG_PATH)) fs.writeFileSync(SAMPLE_JPG_PATH, Buffer.from(JPG_B64, 'base64'));
    if (!fs.existsSync(SAMPLE_PNG_PATH)) fs.writeFileSync(SAMPLE_PNG_PATH, Buffer.from(PNG_B64, 'base64'));
    if (!fs.existsSync(SAMPLE_WEBP_PATH)) fs.writeFileSync(SAMPLE_WEBP_PATH, Buffer.from(WEBP_B64, 'base64'));
    if (!fs.existsSync(SAMPLE_BMP_PATH)) fs.writeFileSync(SAMPLE_BMP_PATH, Buffer.from(BMP_B64, 'base64'));
    if (!fs.existsSync(SAMPLE_TIFF_PATH)) fs.writeFileSync(SAMPLE_TIFF_PATH, Buffer.from(TIFF_B64, 'base64'));
    if (!fs.existsSync(SAMPLE_TXT_PATH)) fs.writeFileSync(SAMPLE_TXT_PATH, 'This is a sample text file.');
    if (!fs.existsSync(SAMPLE_MD_PATH)) fs.writeFileSync(SAMPLE_MD_PATH, '# This is a sample markdown file\n\n- Item 1\n- Item 2');

    // Create Valid Dummy Office Files

    // 1. DOCX
    if (!fs.existsSync(SAMPLE_DOCX_PATH)) {
        const doc = new Document({
            sections: [{
                children: [new Paragraph({ children: [new TextRun("Hello World from DOCX")] })],
            }],
        });
        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(SAMPLE_DOCX_PATH, buffer);
    }

    // 2. XLSX
    if (!fs.existsSync(SAMPLE_XLSX_PATH)) {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([["Header 1", "Header 2"], ["Data 1", "Data 2"]]);
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(SAMPLE_XLSX_PATH, buffer);
    }

    // 3. PPTX
    if (!fs.existsSync(SAMPLE_PPTX_PATH)) {
        const PptxGenJS = pptxgen.default || pptxgen;
        const pptx = new PptxGenJS();
        const slide = pptx.addSlide();
        slide.addText("Hello World from PPTX", { x: 1, y: 1 });
        await pptx.writeFile({ fileName: SAMPLE_PPTX_PATH });
    }
};

test.describe('Additional PDF Tools', () => {
  // Increase timeout for the suite, as Office generation/processing is heavy
  test.setTimeout(60000);

  test.beforeAll(async () => {
      await ensureTestFiles();
  });

  // Removed afterAll cleanup to prevent race conditions during parallel execution
  // Files are ignored in .gitignore

  test.beforeEach(async ({ page }) => {
    // Ensure files exist before EACH test to handle potential deletion/race conditions
    await ensureTestFiles();

    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.dismiss();
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Convert' }).click();
    await expect(page.getByText('All PDF Tools')).toBeVisible();
  });

  // --- Simulated Tools ---
  // Note: Some tools were moved to dedicated tests or require configuration now
  const simulatedTools = [
    // 'Add Watermark', // Requires config now
    // 'Header & Footer', // Requires config now
    // 'Invert Colors', // Requires config now
    // 'Background Color', // Requires config now
    // 'Change Text Color', // Requires config now
    // 'Add Stamps', // Requires config now
    'Remove Annotations',
    'Remove Blank Pages',
    'View Metadata',
    'Edit Metadata',
    'PDF Reader'
  ];

  for (const tool of simulatedTools) {
    test(`Tool: ${tool} (Simulated)`, async ({ page }) => {
      await page.getByText(tool, { exact: true }).click();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(SAMPLE_PDF_PATH);
      await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
    });
  }

  // --- Navigation Tools ---
  test('Tool: Sign PDF (Navigation)', async ({ page }) => {
    await page.getByText('Sign PDF', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'eSign & Track' })).toBeVisible();
    await expect(page.getByText('Manage your signature requests')).toBeVisible();
  });

  test('Tool: Form Filler (Navigation)', async ({ page }) => {
    await page.getByText('Form Filler', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
    await expect(page.getByText('Create, fill, and distribute PDF forms')).toBeVisible();
  });

  test('Tool: Form Creator (Navigation)', async ({ page }) => {
    await page.getByText('Form Creator', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Forms', exact: true })).toBeVisible();
    await expect(page.getByText('Create, fill, and distribute PDF forms')).toBeVisible();
  });

  test('Tool: Edit PDF (Navigation)', async ({ page }) => {
    await page.locator('button').filter({ hasText: 'Edit PDF' }).filter({ hasText: 'Add text' }).click();
    await expect(page.getByText('Recent Files')).toBeVisible();
  });

  // --- Image to PDF Conversions ---
  test('Tool: JPG to PDF', async ({ page }) => {
    await page.getByText('JPG to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_JPG_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: PNG to PDF', async ({ page }) => {
    await page.getByText('PNG to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PNG_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: WebP to PDF', async ({ page }) => {
    await page.getByText('WebP to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_WEBP_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: BMP to PDF', async ({ page }) => {
    await page.getByText('BMP to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_BMP_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  // --- PDF to Image Formats ---
  const imageFormats = ['PDF to JPG', 'PDF to PNG', 'PDF to WebP', 'PDF to BMP', 'PDF to TIFF'];
  for (const format of imageFormats) {
    test(`Tool: ${format}`, async ({ page }) => {
      await page.getByText(format, { exact: true }).click();
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(SAMPLE_PDF_PATH);
      await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 30000 });
    });
  }

  // --- Text/Markdown/HTML to PDF ---
  test('Tool: Text to PDF', async ({ page }) => {
    await page.getByText('Text to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_TXT_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: Markdown to PDF', async ({ page }) => {
    await page.getByText('Markdown to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_MD_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: HTML to PDF', async ({ page }) => {
    await page.getByText('HTML to PDF', { exact: true }).click();
    await expect(page.getByText('Choose Input Method')).toBeVisible();
    const textarea = page.locator('textarea');
    await textarea.fill('<h1>Hello World</h1><p>This is a test.</p>');
    await page.getByRole('button', { name: 'Convert Content' }).click();
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  // --- Office to PDF ---
  test('Tool: Word to PDF', async ({ page }) => {
    await page.getByText('Word to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_DOCX_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('Tool: Excel to PDF', async ({ page }) => {
    await page.getByText('Excel to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_XLSX_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  test('Tool: PPT to PDF', async ({ page }) => {
    await page.getByText('PPT to PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PPTX_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 45000 });
  });

  // --- PDF to Text / JSON ---
  test('Tool: PDF to Text', async ({ page }) => {
    await page.getByText('PDF to Text', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  test('Tool: PDF to JSON', async ({ page }) => {
    await page.getByText('PDF to JSON', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByText('Conversion Complete!')).toBeVisible({ timeout: 15000 });
  });

  // --- Other Tools ---
  test('Tool: Extract PDF Pages', async ({ page }) => {
    await page.getByText('Extract PDF Pages', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByRole('heading', { name: 'Extract Pages' })).toBeVisible();
  });

  test('Tool: Scan to PDF', async ({ page }) => {
    await page.getByText('Scan to PDF', { exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Scan to PDF' })).toBeVisible();
    await expect(page.getByText('Capture documents using your camera')).toBeVisible();
  });

  test('Tool: Compare PDF', async ({ page }) => {
    await page.getByText('Compare PDF', { exact: true }).click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_PDF_PATH);
    await expect(page.getByRole('heading', { name: 'Compare PDF' })).toBeVisible();
    await expect(page.getByText('Upload Second PDF')).toBeVisible();
  });

});
