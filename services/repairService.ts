import { PDFDocument } from 'pdf-lib';

export const repairPDF = async (file: File): Promise<Blob> => {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // distinct loading options could be added here if needed
    // pdf-lib automatically attempts to repair XRef tables when loading
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // We can also try to copy pages to a new document to ensure a clean structure
    const newDoc = await PDFDocument.create();
    const pages = await newDoc.copyPages(pdfDoc, pdfDoc.getPageIndices());

    pages.forEach(page => newDoc.addPage(page));

    const savedBytes = await newDoc.save();
    return new Blob([savedBytes], { type: 'application/pdf' });
  } catch (error) {
    console.error("Repair failed:", error);
    throw new Error("Failed to repair PDF. The file might be too corrupted.");
  }
};
