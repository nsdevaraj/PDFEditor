import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import UTIF from 'utif';

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

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
  const CONCURRENCY = 3;
  const pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1);

  const processPage = async (pageNum: number) => {
    try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High quality

        // Create a new canvas for each page to allow parallelism
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create canvas context');

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render page
        const renderContext = {
          canvasContext: context,
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
            blob = await new Promise<Blob | null>((resolve) => {
              canvas.toBlob((b) => resolve(b), mimeType, 0.9); // 0.9 quality for jpg
            });
        }

        if (blob) {
          zip.file(`page_${pageNum}.${extension}`, blob);
        }

        // Clean up canvas
        canvas.width = 0;
        canvas.height = 0;

        processedCount++;
        onProgress((processedCount / numPages) * 100);
    } catch (error) {
        console.error(`Error processing page ${pageNum}`, error);
        // Continue processing other pages
        processedCount++;
        onProgress((processedCount / numPages) * 100);
    }
  };

  // Process pages in batches
  for (let i = 0; i < pageNumbers.length; i += CONCURRENCY) {
    const batch = pageNumbers.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(pageNum => processPage(pageNum)));
  }

  // Generate zip
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
};
