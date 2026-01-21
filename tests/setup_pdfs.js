import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

async function createSamplePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 30;

  page.drawText('Sample PDF for Testing', {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0.53, 0.71),
  });

  page.drawText('This is a sample document created for validating PDF tools.', {
    x: 50,
    y: height - 6 * fontSize,
    size: 12,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('sample.pdf', pdfBytes);
  console.log('sample.pdf created');

  return pdfBytes;
}

async function createProtectedPdf() {
    // Skipping protected PDF generation as encrypt method is missing in installed pdf-lib
    console.log('Skipping protected PDF generation due to missing encrypt method.');
}

async function main() {
    await createSamplePdf();
    await createProtectedPdf();
}

main().catch(err => console.error(err));
