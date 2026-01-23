import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { jsPDF } from 'jspdf';

// Configure PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PageResult {
  imageData: string;
  widthPt: number;
  heightPt: number;
  lines: { text: string; bbox: any }[];
  pageIndex: number;
}

export const performOCR = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    // Use 2 workers to balance speed and resource usage
    const CONCURRENCY = 2;
    const workerCount = Math.min(totalPages, CONCURRENCY);

    // Initialize workers
    // We use the same options as the original code
    const createWorker = async () => {
        return await Tesseract.createWorker('eng', 1, {
            langPath: '/tessdata/',
            gzip: true,
            logger: () => {} // Silence logger to avoid console spam from multiple workers
        });
    };

    const workers = await Promise.all(Array(workerCount).fill(0).map(() => createWorker()));

    // Queue of page indices to process
    const queue = Array.from({ length: totalPages }, (_, i) => i + 1);
    const results: PageResult[] = new Array(totalPages);
    let completedCount = 0;

    // Worker task function
    const runWorker = async (worker: Tesseract.Worker) => {
        while (queue.length > 0) {
            const pageIndex = queue.shift();
            if (pageIndex === undefined) break;

            // Render page (Just-In-Time to save memory)
            const page = await pdf.getPage(pageIndex);
            const scale = 2.0;
            const viewport = page.getViewport({ scale: scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas context unavailable');

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            const imageData = canvas.toDataURL('image/png');

            // Perform OCR
            const result = await worker.recognize(imageData);

            // Store result
            results[pageIndex - 1] = {
                imageData,
                widthPt: viewport.width / scale,
                heightPt: viewport.height / scale,
                lines: result.data.lines,
                pageIndex
            };

            completedCount++;
            onProgress((completedCount / totalPages) * 100);
        }
    };

    // Run workers in parallel
    await Promise.all(workers.map(w => runWorker(w)));

    // Terminate workers
    await Promise.all(workers.map(w => w.terminate()));

    // Create PDF sequentially
    let doc: jsPDF | null = null;

    for (const res of results) {
      if (!res) continue; // Should not happen if all pages processed

      if (!doc) {
        doc = new jsPDF({ unit: 'pt', format: [res.widthPt, res.heightPt] });
      } else {
        doc.addPage([res.widthPt, res.heightPt]);
      }

      // Add image (fit to page)
      doc.addImage(res.imageData, 'PNG', 0, 0, res.widthPt, res.heightPt);

      // Add invisible text for searchability
      const scale = 2.0;

      for (const line of res.lines) {
          const x = line.bbox.x0 / scale;
          const y = line.bbox.y1 / scale;
          const h = (line.bbox.y1 - line.bbox.y0) / scale;

          doc.setFontSize(h);
          doc.setTextColor(255, 255, 255);
          doc.text(line.text, x, y, { renderingMode: 'invisible' });
      }
    }

    if (!doc) throw new Error("Document creation failed");
    return doc.output('blob');
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
