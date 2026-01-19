import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';

// Configure PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const performOCR = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    let doc: jsPDF | null = null;
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      // Use scale 2 for better OCR
      const scale = 2.0;
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas context unavailable');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      const imageData = canvas.toDataURL('image/png');

      const result = await Tesseract.recognize(imageData, 'eng', {
        langPath: '/tessdata/', // Use local traineddata
        gzip: true, // Expect .gz file
        logger: (m) => {
          if (m.status === 'recognizing text') {
             const pageProgress = m.progress;
             const overallProgress = ((i - 1 + pageProgress) / totalPages) * 100;
             onProgress(Math.min(overallProgress, 99));
          }
        }
      });

      // Original size in points (PDF.js uses 72 DPI for viewport by default when scale=1)
      const widthPt = viewport.width / scale;
      const heightPt = viewport.height / scale;

      if (!doc) {
        doc = new jsPDF({ unit: 'pt', format: [widthPt, heightPt] });
      } else {
        doc.addPage([widthPt, heightPt]);
      }

      // Add image (fit to page)
      doc.addImage(imageData, 'PNG', 0, 0, widthPt, heightPt);

      // Add invisible text for searchability
      const lines = result.data.lines;

      for (const line of lines) {
          // line.bbox is { x0, y0, x1, y1 } in image coords (scaled by 2)
          // We need to scale down by 2 to match PDF points.
          const x = line.bbox.x0 / scale;
          // y1 is bottom of bounding box. jsPDF text x,y is baseline.
          // Baseline is roughly y1.
          const y = line.bbox.y1 / scale;
          const h = (line.bbox.y1 - line.bbox.y0) / scale;

          doc.setFontSize(h);
          // renderingMode: 'invisible' makes text selectable but not visible
          doc.text(line.text, x, y, { renderingMode: 'invisible' });
      }

      onProgress((i / totalPages) * 100);
    }

    if (!doc) throw new Error("Document creation failed");
    return doc.output('blob');
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
