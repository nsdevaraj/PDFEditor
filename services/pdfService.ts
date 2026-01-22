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

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);

            // Render at 1.5 scale for reasonable quality before compression
            const renderScale = 1.5;
            const viewport = page.getViewport({ scale: renderScale });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

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

export const flattenPDF = async (
  file: File,
  onProgress: (progress: number) => void
): Promise<Blob> => {
  return new Promise(async (resolve, reject) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);

        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;

        let pdfDoc: jsPDF | null = null;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);

            // Render at higher scale for better quality (flattening shouldn't degrade quality too much)
            const renderScale = 2.0;
            const viewport = page.getViewport({ scale: renderScale });

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;

            // Use PNG or high quality JPEG for flattening
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            if (!blob) throw new Error('Failed to create blob from canvas');
            const buffer = await blob.arrayBuffer();
            const imgData = new Uint8Array(buffer);

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
        console.error("Flattening error:", error);
        reject(error);
    }
  });
};
