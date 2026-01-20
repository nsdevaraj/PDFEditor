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

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High quality

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (!context) throw new Error('Could not create canvas context');

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
      // Add to zip
      zip.file(`page_${i}.${extension}`, blob);
    }

    // Update progress
    onProgress((i / numPages) * 100);
  }

  // Generate zip
  const content = await zip.generateAsync({ type: 'blob' });
  return content;
};
