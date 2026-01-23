import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';

async function createLargePdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  // Create 10 pages
  for (let i = 0; i < 10; i++) {
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 20;

    page.drawText(`Page ${i + 1}`, {
      x: 50,
      y: height - 2 * fontSize,
      size: fontSize,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    // Add some "content" to render
    for (let j = 0; j < 50; j++) {
        page.drawText(`Line ${j + 1} of text content on this page. This is some filler text to make the page non-trivial.`, {
            x: 50,
            y: height - (4 * fontSize) - (j * 15),
            size: 10,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
        });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('large_sample.pdf', pdfBytes);
  console.log('large_sample.pdf created');
}

createLargePdf().catch(console.error);
