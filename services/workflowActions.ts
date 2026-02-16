import { PDFDocument, degrees } from 'pdf-lib';
import { compressPDF, flattenPDF } from './pdfService';
import {
  convertPDFToExcel,
  convertPDFToPPT,
  convertPDFToWord,
  convertWordToPDF,
  convertExcelToPDF,
  convertPPTToPDF,
  convertImageToPDF,
  convertHTMLToPDF
} from './conversionService';
import { performOCR } from './ocrService';
import { repairPDF } from './repairService';

// --- Helper Types ---

export type WorkflowToolId =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'organize'
  | 'compress'
  | 'protect'
  | 'unlock'
  | 'flatten'
  | 'repair'
  | 'ocr'
  | 'pdf-to-word'
  | 'pdf-to-excel'
  | 'pdf-to-ppt'
  | 'pdf-to-image'
  | 'word-to-pdf'
  | 'excel-to-pdf'
  | 'ppt-to-pdf'
  | 'image-to-pdf'
  | 'html-to-pdf';

// --- Core Actions ---

export const mergePDFs = async (files: (File | Blob)[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const savedBytes = await mergedPdf.save();
  return new Blob([savedBytes], { type: 'application/pdf' });
};

export const rotatePDF = async (file: File | Blob, angle: number): Promise<Blob> => {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(buffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
  });

  const savedBytes = await pdfDoc.save();
  return new Blob([savedBytes], { type: 'application/pdf' });
};

export const extractPages = async (file: File | Blob, range: string): Promise<Blob> => {
  const buffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buffer);
  const newDoc = await PDFDocument.create();
  const totalPages = srcDoc.getPageCount();

  const indicesToCopy = new Set<number>();
  const parts = range.split(',');

  parts.forEach(part => {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
           if (i >= 1 && i <= totalPages) {
             indicesToCopy.add(i - 1);
           }
        }
      }
    } else {
      const page = Number(trimmed);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        indicesToCopy.add(page - 1);
      }
    }
  });

  const sortedIndices = Array.from(indicesToCopy).sort((a, b) => a - b);

  if (sortedIndices.length === 0) {
      throw new Error("No valid pages selected for extraction.");
  }

  const copiedPages = await newDoc.copyPages(srcDoc, sortedIndices);
  copiedPages.forEach(page => newDoc.addPage(page));

  const savedBytes = await newDoc.save();
  return new Blob([savedBytes], { type: 'application/pdf' });
};

export const protectPDF = async (file: File | Blob, password: string): Promise<Blob> => {
    // Current pdf-lib version in package.json (1.17.1) DOES NOT support encryption.
    // However, the component `ToolsGrid.tsx` uses `@pdfsmaller/pdf-encrypt-lite` for encryption.
    // I need to import that dynamically.
    if (!password) return new Blob([await file.arrayBuffer()], { type: 'application/pdf' });

    const { encryptPDF } = await import('@pdfsmaller/pdf-encrypt-lite');
    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);
    const encryptedBytes = await encryptPDF(pdfBytes, password, password);
    return new Blob([encryptedBytes], { type: 'application/pdf' });
};

export const unlockPDF = async (file: File | Blob, password: string): Promise<Blob> => {
    const buffer = await file.arrayBuffer();
    // pdf-lib can decrypt if password is provided to load
    const pdfDoc = await PDFDocument.load(buffer, { password });
    const savedBytes = await pdfDoc.save(); // save() without encryption options removes password
    return new Blob([savedBytes], { type: 'application/pdf' });
};


// --- Dispatcher ---

/**
 * Executes a tool action based on the ID.
 * @param toolId The ID of the tool to execute.
 * @param inputs The input file(s). Can be a single File/Blob or an array.
 * @param params Additional parameters (password, angle, range, etc.)
 */
export const executeToolAction = async (
  toolId: WorkflowToolId,
  inputs: (File | Blob) | (File | Blob)[],
  params: any = {}
): Promise<Blob> => {

    const input = Array.isArray(inputs) ? inputs[0] : inputs;
    const inputList = Array.isArray(inputs) ? inputs : [inputs];

    // Helper to cast Blob to File if needed by service (mostly for name, but services read arrayBuffer)
    // Most services in this codebase take `File`. We can mock a File from Blob.
    const toFile = (blob: Blob, name: string = 'input.pdf'): File => {
        if (blob instanceof File) return blob;
        return new File([blob], name, { type: blob.type });
    };

    switch (toolId) {
        case 'merge':
            if (inputList.length < 2) throw new Error("Merge requires at least 2 files.");
            return await mergePDFs(inputList);

        case 'split': // Treating split as "extract" for workflow single-output flow
            // If params.range is set, use it. Else throw or extract all (which is copy).
            if (!params.range) throw new Error("Split/Extract requires a page range.");
            return await extractPages(input, params.range);

        case 'rotate':
            return await rotatePDF(input, params.angle || 90);

        case 'compress':
            return await compressPDF(toFile(input), (p) => { /* no-op progress */ });

        case 'flatten':
            return await flattenPDF(toFile(input), (p) => { /* no-op progress */ });

        case 'protect':
            return await protectPDF(input, params.password || '');

        case 'unlock':
            return await unlockPDF(input, params.password || '');

        case 'repair':
            return await repairPDF(toFile(input));

        case 'ocr':
            return await performOCR(toFile(input), (p) => {});

        case 'pdf-to-word':
            return await convertPDFToWord(toFile(input));

        case 'pdf-to-excel':
            return await convertPDFToExcel(toFile(input));

        case 'pdf-to-ppt':
            return await convertPDFToPPT(toFile(input));

        case 'word-to-pdf':
            return await convertWordToPDF(toFile(input, 'input.docx'));

        case 'excel-to-pdf':
            return await convertExcelToPDF(toFile(input, 'input.xlsx'));

        case 'ppt-to-pdf':
            return await convertPPTToPDF(toFile(input, 'input.pptx'));

        case 'image-to-pdf':
            return await convertImageToPDF(toFile(input, 'input.jpg'));

        case 'html-to-pdf':
            // params.content is required if input is not text file
            if (params.content) {
                return await convertHTMLToPDF(params.content);
            }
             // Try to read input as text
             const text = await input.text();
             return await convertHTMLToPDF(text);

        default:
            throw new Error(`Tool action '${toolId}' not implemented.`);
    }
};
