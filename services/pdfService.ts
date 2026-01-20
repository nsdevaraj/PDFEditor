import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

export const compressPDF = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        // pdfjs-dist expects Uint8Array or similar for data
        const data = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        let pdfDoc: jsPDF | null = null;

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);

            // Render at 1.5 scale for reasonable quality before compression
            const renderScale = 1.5;
            const viewport = page.getViewport({ scale: renderScale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas context not available');

            await page.render({ canvasContext: context, viewport }).promise;

            // Compress to JPEG with 0.5 quality
            const imgData = canvas.toDataURL('image/jpeg', 0.5);

            // Calculate original page dimensions in points
            const pdfPageWidth = viewport.width / renderScale;
            const pdfPageHeight = viewport.height / renderScale;

            const orientation = pdfPageWidth > pdfPageHeight ? 'l' : 'p';

            if (!pdfDoc) {
                pdfDoc = new jsPDF({
                    orientation: orientation,
                    unit: 'pt',
                    format: [pdfPageWidth, pdfPageHeight]
                });
            } else {
                pdfDoc.addPage([pdfPageWidth, pdfPageHeight], orientation);
            }

            // Add image to the PDF page
            pdfDoc.addImage(imgData, 'JPEG', 0, 0, pdfPageWidth, pdfPageHeight, undefined, 'FAST');

            onProgress((i / totalPages) * 100);
        }

        if (pdfDoc) {
            const blob = pdfDoc.output('blob');
            resolve(blob);
        } else {
            reject(new Error('No pages processed'));
        }

    } catch (error) {
        console.error("Compression error:", error);
        reject(error);
    }
  });
};
