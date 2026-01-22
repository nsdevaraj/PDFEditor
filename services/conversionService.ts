import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const getPDFDocument = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return await loadingTask.promise;
};

const extractRowsFromPage = async (page: any): Promise<TextItem[][]> => {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    // Extract text items with coordinates
    const items: TextItem[] = textContent.items.map((item: any) => {
      // transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
      // PDF coordinates start from bottom-left
      const tx = item.transform;
      return {
        str: item.str,
        x: tx[4],
        y: viewport.height - tx[5], // Convert to top-down
        width: item.width,
        height: item.height || 10 // approximate height if missing
      };
    });

    // Group by rows (Y coordinate) with tolerance
    const TOLERANCE = 5;
    const rows: TextItem[][] = [];

    // Sort by Y (top to bottom)
    items.sort((a, b) => a.y - b.y);

    let currentRow: TextItem[] = [];
    let currentY = -1;

    for (const item of items) {
      if (currentY === -1 || Math.abs(item.y - currentY) <= TOLERANCE) {
        currentRow.push(item);
        if (currentY === -1) currentY = item.y;
      } else {
        // Sort current row by X
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      }
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }

    return rows;
};

export const convertPDFToExcel = async (file: File): Promise<Blob> => {
  const pdf = await getPDFDocument(file);
  const wb = XLSX.utils.book_new();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);

    // Convert to array of arrays for XLSX
    const sheetData: string[][] = rows.map(row => row.map(item => item.str));

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
  }

  // Write to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const convertPDFToPPT = async (file: File): Promise<Blob> => {
  const pdf = await getPDFDocument(file);
  const pptx = new PptxGenJS();

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const slide = pptx.addSlide();

    // Set slide size roughly to PDF size (optional, PPT usually has defaults)
    // PPTXGenJS defaults to 16:9 10x5.625 inches
    // We will use percentage positioning to match relative layout

    for (const item of textContent.items as any[]) {
      const tx = item.transform;
      const x = tx[4];
      const y = viewport.height - tx[5]; // Convert to top-down

      const xPct = (x / viewport.width) * 100;
      const yPct = (y / viewport.height) * 100;

      // Clean string
      const str = item.str.trim();
      if (!str) continue;

      slide.addText(str, {
        x: `${xPct}%`,
        y: `${yPct}%`,
        w: 'auto',
        h: 'auto',
        fontSize: 12, // Default or try to extract from styles (hard)
        color: '000000'
      });
    }
  }

  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  return blob;
};

export const convertPDFToWord = async (file: File): Promise<Blob> => {
  const pdf = await getPDFDocument(file);
  const allChildren: Paragraph[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);

    // If there are rows, add them as paragraphs
    rows.forEach(row => {
        const text = row.map(item => item.str).join(' ');
        if (text.trim()) {
            allChildren.push(new Paragraph({
                children: [new TextRun(text)],
                spacing: { after: 200 }
            }));
        }
    });

    // Add a page break between pages (except the last one)
    if (pageNum < pdf.numPages) {
       // docx automatically handles pagination, but we can force a break if we want strict page mapping.
       // For flowable documents (Word), letting it flow is usually better, but let's add a visual separator or empty line if needed.
       // Actually, maybe we can add a page break run?
       // new Paragraph({ children: [new TextRun({ break: 1 })] }) is a line break.
       // Page break: new Paragraph({ children: [new PageBreak()] }) - wait, check docx API.
       // It seems simpler to just let it flow for now.
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: allChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
};
