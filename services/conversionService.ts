import type * as pdfjsLib from 'pdfjs-dist';
// Heavy libraries are now lazy-loaded via dynamic imports to reduce initial bundle size
import type { jsPDF } from 'jspdf';
import type JSZip from 'jszip';

// Import types only
import type { Paragraph } from 'docx';

const getPDFDocument = async (file: File) => {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  return await loadingTask.promise;
};

const getConcurrencyLimit = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    // 2x hardware threads to account for IO wait times, max 16 to avoid flooding
    return Math.min(navigator.hardwareConcurrency * 2, 16);
  }
  return 4; // Conservative default
};

const processPagesInBatches = async <T>(
  pdf: any,
  concurrency: number,
  processPage: (pageNum: number) => Promise<T>
): Promise<T[]> => {
  const results: T[] = new Array(pdf.numPages);
  const executing = new Set<Promise<void>>();

  for (let i = 1; i <= pdf.numPages; i++) {
    const p = processPage(i).then((res) => {
      results[i - 1] = res;
    });

    const wrapper = p.then(() => {
      executing.delete(wrapper);
    });

    executing.add(wrapper);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
  return results;
};

const extractRowsFromPage = async (page: any): Promise<string[][]> => {
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const len = textContent.items.length;

    // Use typed arrays to avoid object allocation for every item
    const xs = new Float32Array(len);
    const ys = new Float32Array(len);
    const indices = new Uint32Array(len);
    const strs = new Array(len);

    for (let i = 0; i < len; i++) {
        const item = textContent.items[i] as any;
        const tx = item.transform;
        // transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
        // PDF coordinates start from bottom-left
        xs[i] = tx[4];
        ys[i] = viewport.height - tx[5]; // Convert to top-down
        strs[i] = item.str;
        indices[i] = i;
    }

    // Sort indices by Y
    indices.sort((a, b) => ys[a] - ys[b]);

    const TOLERANCE = 5;
    const rows: string[][] = [];

    let currentRow: number[] = []; // Store indices
    let currentY = -1;
    let isRowSorted = true;
    let lastX = -Infinity;

    if (len > 0) {
        currentRow.push(indices[0]);
        currentY = ys[indices[0]];
        lastX = xs[indices[0]];

        for (let i = 1; i < len; i++) {
            const idx = indices[i];
            const itemY = ys[idx];
            const itemX = xs[idx];

            if (Math.abs(itemY - currentY) <= TOLERANCE) {
                 if (isRowSorted) {
                     if (itemX < lastX) {
                        isRowSorted = false;
                     } else {
                        lastX = itemX;
                     }
                 }
                 currentRow.push(idx);
            } else {
                 if (!isRowSorted) {
                    currentRow.sort((a, b) => xs[a] - xs[b]);
                 }
                 rows.push(currentRow.map(k => strs[k]));
                 currentRow = [idx];
                 currentY = itemY;
                 lastX = itemX;
                 isRowSorted = true;
            }
        }
        if (!isRowSorted) {
            currentRow.sort((a, b) => xs[a] - xs[b]);
        }
        rows.push(currentRow.map(k => strs[k]));
    }

    return rows;
};

export const convertPDFToExcel = async (file: File): Promise<Blob> => {
  const XLSX = await import('xlsx');
  const pdf = await getPDFDocument(file);
  const wb = XLSX.utils.book_new();

  const processPage = async (pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);
    return rows;
  };

  const allPageRows = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  allPageRows.forEach((sheetData, index) => {
    const pageNum = index + 1;
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
  });

  // Write to blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const convertPDFToPPT = async (file: File): Promise<Blob> => {
  const { default: PptxGenJS } = await import('pptxgenjs');
  const pdf = await getPDFDocument(file);
  const pptx = new PptxGenJS();

  const processPage = async (pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    return { viewport, textContent };
  };

  const pagesData = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  pagesData.forEach(({ viewport, textContent }) => {
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
  });

  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  return blob;
};

export const convertPDFToWord = async (file: File): Promise<Blob> => {
  const { Document, Packer, Paragraph, TextRun } = await import('docx');
  const pdf = await getPDFDocument(file);

  const processPage = async (pageNum: number) => {
    const page = await pdf.getPage(pageNum);
    const rows = await extractRowsFromPage(page);
    return rows.map(row => row.join(' '));
  };

  const allPageRows = await processPagesInBatches(pdf, getConcurrencyLimit(), processPage);

  const allChildren: Paragraph[] = [];

  allPageRows.forEach((rows, index) => {
    // If there are rows, add them as paragraphs
    rows.forEach(text => {
      if (text.trim()) {
        allChildren.push(new Paragraph({
          children: [new TextRun(text)],
          spacing: { after: 200 }
        }));
      }
    });

    // Add a page break between pages (except the last one)
    if (index + 1 < pdf.numPages) {
      // docx automatically handles pagination, but we can force a break if we want strict page mapping.
      // For flowable documents (Word), letting it flow is usually better, but let's add a visual separator or empty line if needed.
    }
  });

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
  const { default: mammoth } = await import('mammoth');
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  if (typeof window !== 'undefined') {
      (window as any).html2canvas = html2canvas;
  }

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
        windowWidth: 800, // match element width
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertExcelToPDF = async (file: File): Promise<Blob> => {
  const XLSX = await import('xlsx');
  const { default: html2canvas } = await import('html2canvas');
  const { jsPDF } = await import('jspdf');

  if (typeof window !== 'undefined') {
      (window as any).html2canvas = html2canvas;
  }

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
        windowWidth: 1000,
      });
    });

    return pdf.output('blob');
  } finally {
    document.body.removeChild(element);
  }
};

export const convertPPTToPDF = async (file: File): Promise<Blob> => {
  const { default: JSZip } = await import('jszip');
  const { jsPDF } = await import('jspdf');

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const pdf = new jsPDF('l', 'pt', 'a4'); // Landscape for PPT

  // Try to find slides in ppt/slides/slideX.xml
  // And map relationships to find order, but simple approach: filter files
  const slideFilesData: { name: string; num: number }[] = [];

  // Optimized Loop-Sort-Map with String Operations:
  // 1. Iterate once to filter and extract slide numbers using fast string ops (startsWith/substring).
  // 2. Sort the lightweight object array by number.
  // 3. Map back to filenames.
  // This avoids regex overhead entirely and is faster than regex matching.
  // Using zip.forEach avoids allocating an array of all keys.
  const prefix = 'ppt/slides/slide';
  const suffix = '.xml';
  const prefixLen = prefix.length;
  const suffixLen = suffix.length;

  zip.forEach((relativePath, zipEntry) => {
    const name = zipEntry.name;
    if (name.startsWith(prefix) && name.endsWith(suffix)) {
      const numStr = name.slice(prefixLen, -suffixLen);
      if (numStr.length > 0) {
        const num = Number(numStr);
        if (!isNaN(num)) {
          slideFilesData.push({
            name,
            num
          });
        }
      }
    }
  });

  // Optimization: removed .map() to avoid array allocation
  const slideFiles = slideFilesData
    .sort((a, b) => a.num - b.num);

  if (slideFiles.length === 0) {
      throw new Error("No slides found in this PowerPoint file.");
  }

  const parser = new DOMParser();

  for (let i = 0; i < slideFiles.length; i++) {
      if (i > 0) pdf.addPage();

      const xmlStr = await zip.file(slideFiles[i].name)?.async("string");
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
  const { jsPDF } = await import('jspdf');

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
    const { default: html2canvas } = await import('html2canvas');
    const { jsPDF } = await import('jspdf');

    if (typeof window !== 'undefined') {
        (window as any).html2canvas = html2canvas;
    }
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
                windowWidth: 800,
            });
        });
        return pdf.output('blob');
    } finally {
        document.body.removeChild(element);
    }
};
