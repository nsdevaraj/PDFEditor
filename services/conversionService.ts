import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

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

const compareX = (a: TextItem, b: TextItem) => a.x - b.x;

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
    let isRowSorted = true;

    for (const item of items) {
      if (currentY === -1 || Math.abs(item.y - currentY) <= TOLERANCE) {
        if (currentRow.length > 0 && item.x < currentRow[currentRow.length - 1].x) {
          isRowSorted = false;
        }
        currentRow.push(item);
        if (currentY === -1) currentY = item.y;
      } else {
        // Sort current row by X if needed
        if (!isRowSorted) {
          currentRow.sort(compareX);
        }
        rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
        isRowSorted = true;
      }
    }
    if (currentRow.length > 0) {
      if (!isRowSorted) {
        currentRow.sort(compareX);
      }
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


// --- New Conversions (To PDF) ---

export const convertWordToPDF = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  // mammoth converts docx to HTML
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;

  // Create a temporary element to render HTML (needed for html2canvas/jspdf)
  const element = document.createElement('div');
  element.innerHTML = html;
  element.style.width = '800px'; // Fixed width for A4 approx
  element.style.padding = '20px';
  element.style.background = 'white';
  document.body.appendChild(element);

  try {
    const pdf = new jsPDF('p', 'pt', 'a4');
    // .html() is robust but async.
    // It renders the element to canvas then to PDF.
    await new Promise<void>((resolve) => {
      pdf.html(element, {
        callback: () => resolve(),
        x: 10,
        y: 10,
        width: 575, // A4 width (~595pt) - margins
        windowWidth: 800 // match element width
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertExcelToPDF = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });

  // We'll concatenate all sheets into one HTML
  let fullHtml = '';

  wb.SheetNames.forEach(sheetName => {
      const ws = wb.Sheets[sheetName];
      const html = XLSX.utils.sheet_to_html(ws);
      fullHtml += `<h2>${sheetName}</h2>${html}<br/><hr/><br/>`;
  });

  const element = document.createElement('div');
  element.innerHTML = fullHtml;
  element.style.width = '1000px'; // Wider for excel
  element.style.padding = '20px';
  element.style.background = 'white';
  // Add some basic table styles
  const style = document.createElement('style');
  style.innerHTML = 'table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #ddd; padding: 8px; }';
  element.appendChild(style);

  document.body.appendChild(element);

  try {
    const pdf = new jsPDF('l', 'pt', 'a4'); // Landscape for Excel usually better
    await new Promise<void>((resolve) => {
      pdf.html(element, {
        callback: () => resolve(),
        x: 10,
        y: 10,
        width: 820, // A4 Landscape width (~842pt) - margins
        windowWidth: 1000
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertPPTToPDF = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const pdf = new jsPDF('l', 'pt', 'a4'); // Landscape for PPT

  // Try to find slides in ppt/slides/slideX.xml
  // And map relationships to find order, but simple approach: filter files
  const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));

  // Sort numerically
  slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
      return numA - numB;
  });

  if (slideFiles.length === 0) {
      throw new Error("No slides found in this PowerPoint file.");
  }

  const parser = new DOMParser();

  for (let i = 0; i < slideFiles.length; i++) {
      if (i > 0) pdf.addPage();

      const xmlStr = await zip.file(slideFiles[i])?.async("string");
      if (!xmlStr) continue;

      const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
      // Extract text from <a:t> elements
      const textNodes = xmlDoc.getElementsByTagName("a:t");

      let yPos = 50;
      pdf.setFontSize(14);
      pdf.text(`Slide ${i + 1}`, 40, 30);
      pdf.setFontSize(12);

      for (let j = 0; j < textNodes.length; j++) {
          const text = textNodes[j].textContent || "";
          if (text.trim()) {
             // Split text to fit page
             const splitText = pdf.splitTextToSize(text, 750);
             pdf.text(splitText, 50, yPos);
             yPos += (15 * splitText.length);
             if (yPos > 550) {
                 pdf.addPage();
                 yPos = 50;
             }
          }
      }
  }

  return pdf.output('blob');
};

export const convertImageToPDF = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          if (event.target?.result) {
              const imgData = event.target.result as string;

              const img = new Image();
              img.src = imgData;
              img.onload = () => {
                  const width = img.width;
                  const height = img.height;

                  // Calculate PDF page size based on image (points)
                  // 1px = 0.75pt approx, but let's just use same units or fit to A4
                  // Let's create PDF with same dimensions as image (converted to points? jsPDF default unit is mm usually but we can use pt)
                  // If we use 'pt', we can just pass width/height

                  const pdf = new jsPDF({
                      orientation: width > height ? 'l' : 'p',
                      unit: 'pt',
                      format: [width, height]
                  });

                  pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
                  resolve(pdf.output('blob'));
              };
              img.onerror = (e) => reject(e);
          }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
  });
};

export const convertHTMLToPDF = async (content: string, isUrl: boolean = false): Promise<Blob> => {
    let htmlContent = content;

    // If it is a URL, we can't easily fetch it client-side due to CORS unless we have a proxy.
    // However, if the user passed a URL, we might try to fetch it, but likely it will fail.
    // For this implementation, we will assume 'content' is HTML string provided by user (file or pasted).
    // If 'isUrl' is true, we display it in an iframe? No, iframe contents cannot be accessed if cross-origin.
    // We will support HTML string rendering.

    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.width = '800px';
    element.style.background = 'white';

    // Check if it has images, they might not load if relative paths or protected.
    // We append to body to render
    document.body.appendChild(element);

    try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        await new Promise<void>((resolve) => {
            pdf.html(element, {
                callback: () => resolve(),
                x: 10,
                y: 10,
                width: 575,
                windowWidth: 800
            });
        });
        return pdf.output('blob');
    } finally {
        document.body.removeChild(element);
    }
};
