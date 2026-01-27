import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
// @ts-ignore
import UTIF from 'utif';

// Worker configuration is handled globally in mcp-app.ts

const getConcurrencyLimit = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.max(1, navigator.hardwareConcurrency);
  }
  return 4;
};

export const convertPdfToImages = async (
  file: File,
  format: 'jpg' | 'png' | 'tiff',
  onProgress: (percent: number) => void
): Promise<Blob> => {
  const zip = new JSZip();
  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF file
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const extension = format === 'jpg' ? 'jpg' : format === 'tiff' ? 'tiff' : 'png';
  let processedCount = 0;

  // Parallel processing configuration
  // Using dynamic concurrency to maximize throughput while avoiding main thread blocking
  const concurrency = getConcurrencyLimit();

  // Use OffscreenCanvas if available to reduce main thread overhead
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';

  const canvasPool = Array.from({ length: concurrency }).map(() => {
    let canvas: HTMLCanvasElement | OffscreenCanvas;
    let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

    if (useOffscreen) {
        canvas = new OffscreenCanvas(1, 1);
        context = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null;
    } else {
        canvas = document.createElement('canvas');
        context = canvas.getContext('2d');
    }

    if (!context) throw new Error('Could not create canvas context');
    return { canvas, context };
  });

  // Create a queue of page numbers
  const pagesQueue = Array.from({ length: numPages }, (_, i) => i + 1);

  const processPages = async (poolItem: { canvas: HTMLCanvasElement | OffscreenCanvas, context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D }) => {
     const { canvas, context } = poolItem;
     while (pagesQueue.length > 0) {
         // Determine next page index synchronously
         const pageNum = pagesQueue.shift();
         if (pageNum === undefined) break;

         try {
             const page = await pdf.getPage(pageNum);
             const viewport = page.getViewport({ scale: 2.0 }); // High quality

             // Only resize if necessary to avoid extra layout calculation
             if (canvas.width !== viewport.width || canvas.height !== viewport.height) {
                canvas.width = viewport.width;
                canvas.height = viewport.height;
             } else {
                 // Explicitly clear if dimensions match
                 context.clearRect(0, 0, canvas.width, canvas.height);
             }

             // Render page
             const renderContext = {
               canvasContext: context as any,
               viewport: viewport,
             };

             await page.render(renderContext).promise;

             let blob: Blob | null = null;

             if (format === 'tiff') {
                 const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                 const tiffData = UTIF.encodeImage(imageData.data, canvas.width, canvas.height);
                 blob = new Blob([tiffData], { type: 'image/tiff' });
             } else {
                 const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';

                 if (useOffscreen && canvas instanceof OffscreenCanvas) {
                     blob = await canvas.convertToBlob({ type: mimeType, quality: 0.9 });
                 } else {
                     blob = await new Promise<Blob | null>((resolve) => {
                       (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), mimeType, 0.9);
                     });
                 }
             }

             if (blob) {
               zip.file(`page_${pageNum}.${extension}`, blob);
             }

             processedCount++;
             onProgress((processedCount / numPages) * 100);
         } catch (error) {
             console.error(`Error processing page ${pageNum}`, error);
             processedCount++;
             onProgress((processedCount / numPages) * 100);
         }
     }
  };

  // Start workers
  await Promise.all(canvasPool.map(poolItem => processPages(poolItem)));

  // Generate zip
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
};
